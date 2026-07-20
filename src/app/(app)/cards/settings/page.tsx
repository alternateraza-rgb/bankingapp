"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { SettingsRow } from "@/components/shared/settings-row";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function CardSettingsPage() {
  const card = useAppStore((s) => s.card);
  const updateCard = useAppStore((s) => s.updateCard);
  const [limit, setLimit] = useState(String(card.spendingLimit));

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Card settings" showBack backHref="/cards" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          <SettingsRow
            label="Online payments"
            description="Allow e-commerce purchases"
            toggle
            checked={card.onlinePayments}
            onCheckedChange={(v) => {
              updateCard({ onlinePayments: v });
              toast.success(v ? "Online payments on" : "Online payments off");
            }}
          />
          <SettingsRow
            label="Contactless"
            description="Tap to pay in stores"
            toggle
            checked={card.contactless}
            onCheckedChange={(v) => {
              updateCard({ contactless: v });
              toast.success(v ? "Contactless on" : "Contactless off");
            }}
          />
          <SettingsRow
            label="Foreign transactions"
            description="Spend abroad in local currency"
            toggle
            checked={card.foreignTransactions}
            onCheckedChange={(v) => {
              updateCard({ foreignTransactions: v });
              toast.success(
                v ? "Foreign transactions on" : "Foreign transactions off"
              );
            }}
          />
        </div>

        <div className="rounded-[24px] bg-wise-surface p-4">
          <p className="mb-2 text-sm font-semibold text-white">
            Monthly spending limit (USD)
          </p>
          <Input
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            aria-label="Spending limit"
          />
          <Button
            className="mt-3 w-full"
            onClick={() => {
              const n = Number(limit);
              if (!n || n < 100) {
                toast.error("Enter a limit of at least 100");
                return;
              }
              updateCard({ spendingLimit: n });
              toast.success("Spending limit updated");
            }}
          >
            Save limit
          </Button>
        </div>
      </main>
    </div>
  );
}
