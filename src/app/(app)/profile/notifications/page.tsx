"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationsPage() {
  const [transfers, setTransfers] = useState(true);
  const [rates, setRates] = useState(false);
  const [security, setSecurity] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const rows = [
    {
      id: "transfers",
      label: "Transfers",
      description: "Sent, received, and failed payments",
      checked: transfers,
      onChange: setTransfers,
    },
    {
      id: "rates",
      label: "Rate moves",
      description: "FX and crypto price alerts",
      checked: rates,
      onChange: setRates,
    },
    {
      id: "security",
      label: "Security",
      description: "Sign-ins and card freezes",
      checked: security,
      onChange: setSecurity,
    },
    {
      id: "marketing",
      label: "Product updates",
      description: "Tips and new Niro features",
      checked: marketing,
      onChange: setMarketing,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Notifications" showBack backHref="/profile" />
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
      </main>
    </div>
  );
}
