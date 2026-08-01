"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/app-store";
import {
  getSupabaseSession,
  isSupabaseConfigured,
  profileFromAuthUser,
} from "@/services/auth";
import {
  fetchCloudCards,
  fetchCloudTransactions,
} from "@/services/wise-cloud";
import { tryCreateClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/offline",
  "/manifest.webmanifest",
];

async function syncCloudData(cancelled: () => boolean) {
  const { syncBalancesFromCloud, replaceCloudData } = useAppStore.getState();
  try {
    await syncBalancesFromCloud();
    const [cards, transactions] = await Promise.all([
      fetchCloudCards(),
      fetchCloudTransactions(),
    ]);
    if (cancelled()) return;
    // Ledger from Supabase is source of truth (SQL seed + custom txns)
    replaceCloudData({
      cards,
      transactions,
    });
  } catch (e) {
    console.warn("Cloud sync failed", e);
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const sessionChecked = useAppStore((s) => s.sessionChecked);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const setSessionChecked = useAppStore((s) => s.setSessionChecked);
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);
  const authUserId = useAppStore((s) => s.authUserId);
  const establishSession = useAppStore((s) => s.establishSession);
  const clearLocalAuth = useAppStore((s) => s.clearLocalAuth);
  const router = useRouter();
  const pathname = usePathname();

  // Persist hydration — never leave the app stuck waiting
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // Safety: if storage is blocked, still unblock the UI
    const t = window.setTimeout(() => setHydrated(true), 1500);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  // Source of truth: Supabase session (not localStorage auth flags)
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const isCancelled = () => cancelled;

    const applySignedIn = (session: Session) => {
      const profile = profileFromAuthUser(session.user);
      establishSession({ userId: session.user.id, profile });
      // Defer cloud work so we never call auth APIs inside onAuthStateChange
      window.setTimeout(() => {
        if (cancelled) return;
        void syncCloudData(isCancelled);
      }, 0);
    };

    const bootstrap = async () => {
      if (!isSupabaseConfigured()) {
        if (useAppStore.getState().auth.isAuthenticated) {
          clearLocalAuth();
        }
        if (!cancelled) setSessionChecked(true);
        return;
      }

      try {
        // getSession is local/cookie-based; safer for bootstrap than getUser
        const session = await getSupabaseSession();
        if (cancelled) return;

        if (!session?.user) {
          if (
            useAppStore.getState().auth.isAuthenticated ||
            useAppStore.getState().authUserId
          ) {
            clearLocalAuth();
          }
          setSessionChecked(true);
          return;
        }

        applySignedIn(session);
        setSessionChecked(true);
      } catch (e) {
        console.warn("Session bootstrap failed", e);
        if (!cancelled) setSessionChecked(true);
      }
    };

    void bootstrap();

    const client = tryCreateClient();
    if (!client) {
      setSessionChecked(true);
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      // CRITICAL: keep this callback synchronous.
      // Awaiting supabase.auth.* (getUser/getSession/signOut) here deadlocks
      // the auth client and leaves the app on a black screen.
      if (cancelled) return;

      if (event === "INITIAL_SESSION") {
        // bootstrap() already applied the initial session
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        if (useAppStore.getState().authUserId) {
          clearLocalAuth();
        }
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        window.setTimeout(() => {
          if (cancelled || !session?.user) return;
          applySignedIn(session);
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [
    hydrated,
    establishSession,
    clearLocalAuth,
    setSessionChecked,
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
