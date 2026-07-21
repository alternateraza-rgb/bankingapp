"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { NiroLogo } from "@/components/shared/wise-logo";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/home" : "/signup");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-6">
      <NiroLogo href={null} size="lg" />
      <p className="text-sm text-wise-mute">Setting up Niro…</p>
    </div>
  );
}
