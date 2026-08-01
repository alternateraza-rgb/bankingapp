"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/app-store";
import {
  getSupabaseUser,
  isSupabaseConfigured,
  profileFromAuthUser,
} from "@/services/auth";
import {
  fetchCloudCards,
  fetchCloudTransactions,
} from "@/services/wise-cloud";
import { tryCreateClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/offline",
  "/manifest.webmanifest",
];

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const sessionChecked = useAppStore((s) => s.sessionChecked);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const setSessionChecked = useAppStore((s) => s.setSessionChecked);
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);
  const authUserId = useAppStore((s) => s.authUserId);
  const establishSession = useAppStore((s) => s.establishSession);
  const replaceCloudData = useAppStore((s) => s.replaceCloudData);
  const syncBalancesFromCloud = useAppStore((s) => s.syncBalancesFromCloud);
  const signOut = useAppStore((s) => s.signOut);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }
  }, [setHydrated]);

  // Source of truth: Supabase session (not localStorage auth flags)
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    const syncSession = async () => {
      if (!isSupabaseConfigured()) {
        // Clear any stale local "signed in" state when Supabase is missing
        if (useAppStore.getState().auth.isAuthenticated) {
          await signOut();
        }
        if (!cancelled) setSessionChecked(true);
        return;
      }

      const user = await getSupabaseUser();
      if (cancelled) return;

      if (!user) {
        const state = useAppStore.getState();
        if (state.auth.isAuthenticated || state.authUserId) {
          await signOut();
        }
        setSessionChecked(true);
        return;
      }

      const profile = profileFromAuthUser(user);
      establishSession({ userId: user.id, profile });

      try {
        await syncBalancesFromCloud();
        const [cards, transactions] = await Promise.all([
          fetchCloudCards(),
          fetchCloudTransactions(),
        ]);
        if (!cancelled) {
          replaceCloudData({
            cards,
            ...(transactions.length > 0 ? { transactions } : {}),
          });
        }
      } catch (e) {
        console.warn("Session cloud sync failed", e);
      }

      if (!cancelled) setSessionChecked(true);
    };

    void syncSession();

    const client = tryCreateClient();
    if (!client) {
      setSessionChecked(true);
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        if (useAppStore.getState().authUserId) {
          await signOut();
        }
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const profile = profileFromAuthUser(session.user);
        establishSession({ userId: session.user.id, profile });
        try {
          await syncBalancesFromCloud();
          const [cards, transactions] = await Promise.all([
            fetchCloudCards(),
            fetchCloudTransactions(),
          ]);
          replaceCloudData({
            cards,
            ...(transactions.length > 0 ? { transactions } : {}),
          });
        } catch (e) {
          console.warn("Auth change sync failed", e);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [
    hydrated,
    establishSession,
    replaceCloudData,
    syncBalancesFromCloud,
    setSessionChecked,
    signOut,
  ]);

  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    const authed = Boolean(isAuthenticated && authUserId);

    if (!authed && !isPublic) {
      router.replace("/login");
    }
    if (authed && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
      router.replace("/home");
    }
  }, [
    hydrated,
    sessionChecked,
    isAuthenticated,
    authUserId,
    pathname,
    router,
  ]);

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: "rounded-2xl border border-border font-sans",
        }}
      />
    </>
  );
}
