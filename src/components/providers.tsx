"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/app-store";
import {
  fetchCloudCards,
  fetchCloudTransactions,
  isSupabaseConfigured,
} from "@/services/wise-cloud";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding", "/offline", "/manifest.webmanifest"];

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);
  const mergeCloudData = useAppStore((s) => s.mergeCloudData);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Fallback if persist rehydrate already finished before subscribe
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }
  }, [setHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
    }
    if (isAuthenticated && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
      router.replace("/home");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        // Re-exported helper lives next to client; keep sync best-effort
        const { tryCreateClient: create } = await import("@/lib/supabase/client");
        const client = create();
        if (!client) return;
        const { data } = await client.auth.getSession();
        if (!data.session || cancelled) return;
        const [cards, transactions] = await Promise.all([
          fetchCloudCards(),
          fetchCloudTransactions(),
        ]);
        if (!cancelled) mergeCloudData({ cards, transactions });
      } catch (e) {
        console.warn("Background Supabase sync skipped", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, mergeCloudData]);

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
