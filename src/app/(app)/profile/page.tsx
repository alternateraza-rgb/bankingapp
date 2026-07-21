"use client";

import Link from "next/link";
import {
  ChevronRight,
  User,
  Shield,
  Bell,
  Moon,
  LogOut,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const links = [
  { href: "/profile/personal", label: "Personal information", icon: User },
  { href: "/profile/security", label: "Security", icon: Shield },
  { href: "/profile/notifications", label: "Notifications", icon: Bell },
  { href: "/profile/appearance", label: "Appearance", icon: Moon },
] as const;

export default function ProfilePage() {
  const { profile, signOut, loading } = useAuth();
  const router = useRouter();

  const onSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      router.replace("/login");
    } catch {
      toast.error("Could not sign out");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Profile" showBack backHref="/home" />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-10">
        <div className="flex items-center gap-4 rounded-[24px] bg-wise-surface px-4 py-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wise-surface-2 text-lg font-bold text-white">
            {profile?.avatar_initials ?? "N"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">
              {loading ? "…" : profile?.full_name || "Niro user"}
            </p>
            <p className="truncate text-sm text-wise-mute">
              {profile?.handle ? `@${profile.handle}` : profile?.email}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 border-b border-white/5 px-4 py-4 last:border-0 hover:bg-wise-surface-2"
            >
              <Icon className="h-5 w-5 text-wise-mute" aria-hidden />
              <span className="flex-1 font-medium text-white">{label}</span>
              <ChevronRight className="h-4 w-4 text-wise-mute" aria-hidden />
            </Link>
          ))}
        </div>

        <Button variant="destructive" className="w-full" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </main>
    </div>
  );
}
