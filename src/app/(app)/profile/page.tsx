"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Shield,
  User,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SettingsRow } from "@/components/shared/settings-row";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const signOut = useAppStore((s) => s.signOut);
  const resetAccountData = useAppStore((s) => s.resetAccountData);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const go = (path: string) => () => router.push(path);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Profile" showBack backHref="/home" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="flex items-center gap-4 rounded-[24px] bg-wise-surface p-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wise-forest text-lg font-bold text-wise-green">
            {user.avatarInitials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-sm text-wise-mute">{user.email}</p>
            <p className="mt-1 text-xs font-semibold text-wise-forest">
              {user.plan} plan
            </p>
          </div>
          <button
            type="button"
            onClick={go("/profile/personal")}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wise-surface-2"
            aria-label="Edit personal info"
          >
            <ChevronRight className="h-5 w-5 text-wise-mute" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          <SettingsRow
            icon={User}
            label="Personal information"
            onClick={go("/profile/personal")}
          />
          <SettingsRow
            icon={Moon}
            label="Appearance"
            onClick={go("/profile/appearance")}
          />
          <SettingsRow
            icon={Bell}
            label="Notifications"
            onClick={go("/profile/notifications")}
          />
          <SettingsRow
            icon={Shield}
            label="Security"
            onClick={go("/profile/security")}
          />
          <SettingsRow
            icon={Lock}
            label="Privacy"
            onClick={go("/profile/privacy")}
          />
        </div>

        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          <SettingsRow
            icon={HelpCircle}
            label="Help center"
            onClick={go("/help")}
          />
          <SettingsRow
            icon={FileText}
            label="Legal"
            onClick={go("/profile/legal")}
          />
          <SettingsRow
            icon={LogOut}
            label="Sign out"
            danger
            onClick={() => setSignOutOpen(true)}
          />
        </div>

        <button
          type="button"
          className="text-center text-sm font-semibold text-wise-mute underline"
          onClick={() => {
            resetAccountData();
            toast.success("Account data reset");
          }}
        >
          Reset account data
        </button>
      </main>

      <ConfirmationDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You can sign back in anytime."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          setSignOutOpen(false);
          void signOut().then(() => router.replace("/login"));
        }}
      />
    </div>
  );
}
