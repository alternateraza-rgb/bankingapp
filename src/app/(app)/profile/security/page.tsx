"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SecurityPage() {
  const [passcode, setPasscode] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [alerts, setAlerts] = useState(true);

  const rows = [
    {
      id: "passcode",
      label: "App passcode",
      description: "Require passcode when opening Niro",
      checked: passcode,
      onChange: setPasscode,
    },
    {
      id: "biometric",
      label: "Biometrics",
      description: "Face ID / Touch ID (device setting)",
      checked: biometric,
      onChange: setBiometric,
    },
    {
      id: "2fa",
      label: "Two-factor authentication",
      description: "Extra check on sensitive actions",
      checked: twoFactor,
      onChange: setTwoFactor,
    },
    {
      id: "alerts",
      label: "Security alerts",
      description: "Email when a new device signs in",
      checked: alerts,
      onChange: setAlerts,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Security" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface p-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <div className="min-w-0">
                <Label htmlFor={row.id} className="font-semibold text-white">
                  {row.label}
                </Label>
                <p className="text-xs text-wise-mute">{row.description}</p>
              </div>
              <Switch
                id={row.id}
                checked={row.checked}
                onCheckedChange={row.onChange}
              />
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-wise-mute">
          These toggles are stored on this device only for the demo.
        </p>
      </main>
    </div>
  );
}
