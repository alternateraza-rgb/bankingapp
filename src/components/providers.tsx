"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/app-store";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding", "/offline", "/manifest.webmanifest"];

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);
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
