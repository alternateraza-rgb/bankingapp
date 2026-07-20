"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { SettingsRow } from "@/components/shared/settings-row";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.settings.notifications);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const set = (key: keyof typeof notifications, value: boolean) => {
    updateSettings({
      notifications: { ...notifications, [key]: value },
    });
    toast.success("Notification preference saved");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Notifications" showBack backHref="/profile" />
      <main className="px-4 pb-8">
        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          <SettingsRow
            label="Transfers"
            description="Updates when money is sent or received"
            toggle
            checked={notifications.transfers}
            onCheckedChange={(v) => set("transfers", v)}
          />
          <SettingsRow
            label="Exchange rates"
            description="Rate alerts you subscribe to"
            toggle
            checked={notifications.rates}
            onCheckedChange={(v) => set("rates", v)}
          />
          <SettingsRow
            label="Security"
            description="Sign-ins and sensitive changes"
            toggle
            checked={notifications.security}
            onCheckedChange={(v) => set("security", v)}
          />
          <SettingsRow
            label="Marketing"
            description="Tips and product news"
            toggle
            checked={notifications.marketing}
            onCheckedChange={(v) => set("marketing", v)}
          />
        </div>
      </main>
    </div>
  );
}
