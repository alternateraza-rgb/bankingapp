"use client";

import Link from "next/link";
import { Settings, Wallet } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { VirtualCard } from "@/components/cards/virtual-card";
import { TransactionRow } from "@/components/activity/transaction-row";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export default function CardsPage() {
  const card = useAppStore((s) => s.card);
  const updateCard = useAppStore((s) => s.updateCard);
  const transactions = useAppStore((s) => s.transactions);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);

  const cardTxns = transactions.filter((t) => t.type === "card").slice(0, 5);
  const pct = Math.min(
    100,
    Math.round((card.spendingUsed / card.spendingLimit) * 100)
  );

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title="Cards"
        showBack
        backHref="/home"
        rightSlot={
          <Link
            href="/cards/settings"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Card settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        }
      />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-8">
        <VirtualCard
          card={card}
          onToggleFreeze={() => {
            updateCard({ frozen: !card.frozen });
            toast.success(card.frozen ? "Card unfrozen" : "Card frozen");
          }}
        />

        <div className="rounded-[24px] bg-wise-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Spending limit</p>
            <p className="text-sm text-wise-mute">
              {formatMoney(card.spendingUsed, "USD")} /{" "}
              {formatMoney(card.spendingLimit, "USD")}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-wise-surface-2">
            <div
              className="h-full rounded-full bg-wise-green"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Spending used"
            />
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            toast.message("Apple Wallet", {
              description:
                "Opening Apple Wallet…",
            })
          }
        >
          <Wallet className="h-4 w-4" aria-hidden />
          Add to Apple Wallet
        </Button>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold text-white">Recent card activity</h3>
            <Link
              href="/activity?filter=card"
              className="text-sm font-semibold text-wise-forest"
            >
              View all
            </Link>
          </div>
          <div className="rounded-[24px] bg-wise-surface px-3 py-1">
            {cardTxns.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                hideAmount={hideBalances}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
