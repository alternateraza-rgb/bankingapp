"use client";

import { format } from "date-fns";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SettingsRow } from "@/components/shared/settings-row";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";
import { toast } from "sonner";

export default function SecurityPage() {
  const security = useAppStore((s) => s.security);
  const updateSecurity = useAppStore((s) => s.updateSecurity);
  const removeDevice = useAppStore((s) => s.removeDevice);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Security" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          <SettingsRow
            label="Passcode"
            description="Require a 6-digit passcode"
            toggle
            checked={security.passcodeEnabled}
            onCheckedChange={(v) => {
              updateSecurity({ passcodeEnabled: v });
              toast.success(v ? "Passcode enabled" : "Passcode disabled");
            }}
          />
          <SettingsRow
            label="Biometric login"
            description="Face ID / Touch ID"
            toggle
            checked={security.biometricEnabled}
            onCheckedChange={(v) => {
              updateSecurity({ biometricEnabled: v });
              toast.success(v ? "Biometrics on" : "Biometrics off");
            }}
          />
          <SettingsRow
            label="Two-factor authentication"
            description="Extra step when signing in"
            toggle
            checked={security.twoFactorEnabled}
            onCheckedChange={(v) => {
              updateSecurity({ twoFactorEnabled: v });
              toast.success(v ? "2FA enabled" : "2FA disabled");
            }}
          />
          <SettingsRow
            label="Security alerts"
            description="Notify about new devices"
            toggle
            checked={security.securityAlerts}
            onCheckedChange={(v) => updateSecurity({ securityAlerts: v })}
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => toast.message("Change password", { description: "We'll email you a secure link to change your password." })}
        >
          Change password
        </Button>

        <section>
          <h3 className="mb-2 px-1 font-bold text-white">
            Logged-in devices
          </h3>
          <div className="overflow-hidden rounded-[24px] bg-wise-surface">
            {security.devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {d.name}
                    {d.current ? (
                      <span className="ml-2 rounded-full bg-wise-green-pale px-2 py-0.5 text-[10px] font-bold text-wise-forest">
                        This device
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-wise-mute">
                    {d.location} · {format(new Date(d.lastActive), "MMM d, HH:mm")}
                  </p>
                </div>
                {!d.current ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-wise-negative"
                    onClick={() => setDeviceId(d.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>

      <ConfirmationDialog
        open={!!deviceId}
        onOpenChange={(open) => !open && setDeviceId(null)}
        title="Remove device?"
        description="This device will need to sign in again."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (deviceId) removeDevice(deviceId);
          setDeviceId(null);
          toast.success("Device removed");
        }}
      />
    </div>
  );
}
