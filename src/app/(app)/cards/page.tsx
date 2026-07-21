"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Snowflake, ShoppingBag } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { VirtualCard } from "@/components/cards/virtual-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNiroData } from "@/hooks/use-niro-data";
import {
  createVirtualCard,
  setCardStatus,
  simulateCardSpend,
} from "@/services/niro";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import type { CardRow } from "@/types/database";

export default function CardsPage() {
  const { cards, wallets, loading, refresh } = useNiroData();
  const [creating, setCreating] = useState(false);
  const [spendAmount, setSpendAmount] = useState("25");
  const [busyId, setBusyId] = useState<string | null>(null);

  const primary = cards[0] ?? null;
  const usdWallet = wallets.find((w) => w.currency === "USD") ?? wallets[0];

  const create = async () => {
    if (!usdWallet) {
      toast.error("Need a wallet to attach a card");
      return;
    }
    setCreating(true);
    try {
      await createVirtualCard(usdWallet.id);
      await refresh();
      toast.success("Virtual card created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create card");
    } finally {
      setCreating(false);
    }
  };

  const toggleFreeze = async (card: CardRow) => {
    setBusyId(card.id);
    try {
      const next = card.status === "frozen" ? "active" : "frozen";
      await setCardStatus(card.id, next);
      await refresh();
      toast.success(next === "frozen" ? "Card frozen" : "Card unfrozen");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  };

  const simulate = async (card: CardRow) => {
    const amount = Number(spendAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter a spend amount");
      return;
    }
    setBusyId(card.id);
    try {
      await simulateCardSpend(card.id, amount, "Demo Merchant");
      await refresh();
      toast.success(`Spent ${formatMoney(amount, "USD")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spend failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title="Cards"
        showBack
        backHref="/home"
        rightSlot={
          primary ? (
            <Link
              href="/cards/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-wise-surface-2 text-white"
              aria-label="Card settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-10">
        {loading ? (
          <p className="py-10 text-center text-sm text-wise-mute">Loading…</p>
        ) : !primary ? (
          <div className="rounded-[28px] bg-wise-surface px-5 py-10 text-center">
            <p className="text-lg font-semibold text-white">No virtual card</p>
            <p className="mt-2 text-sm text-wise-mute">
              Create a Niro virtual debit card linked to your wallet.
            </p>
            <Button className="mt-6 w-full" onClick={create} disabled={creating}>
              {creating ? "Creating…" : "Create virtual card"}
            </Button>
          </div>
        ) : (
          <>
            <VirtualCard
              card={{
                id: primary.id,
                cardholderName: primary.cardholder_name,
                last4: primary.last4,
                fullNumber: primary.full_number,
                expiry: primary.expiry,
                cvv: primary.cvv,
                network: primary.network,
                frozen: primary.status === "frozen",
                spendLimitDaily: Number(primary.spend_limit_daily),
                spendLimitMonthly: Number(primary.spend_limit_monthly),
                spentToday: Number(primary.spent_today),
                spentMonth: Number(primary.spent_month),
              }}
              onToggleFreeze={() => void toggleFreeze(primary)}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => void toggleFreeze(primary)}
                disabled={busyId === primary.id}
              >
                <Snowflake className="h-4 w-4" />
                {primary.status === "frozen" ? "Unfreeze" : "Freeze"}
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/cards/settings">Limits</Link>
              </Button>
            </div>

            <section className="rounded-[24px] bg-wise-surface p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShoppingBag className="h-4 w-4" />
                Simulate spend
              </h2>
              <p className="mt-1 text-xs text-wise-mute">
                Demo charge against daily / monthly limits.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  inputMode="decimal"
                  value={spendAmount}
                  onChange={(e) =>
                    setSpendAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  aria-label="Spend amount"
                />
                <Button
                  onClick={() => void simulate(primary)}
                  disabled={busyId === primary.id || primary.status === "frozen"}
                  className="shrink-0"
                >
                  Pay
                </Button>
              </div>
              <p className="mt-3 text-xs text-wise-mute">
                Today {formatMoney(Number(primary.spent_today), "USD")} /{" "}
                {formatMoney(Number(primary.spend_limit_daily), "USD")} · Month{" "}
                {formatMoney(Number(primary.spent_month), "USD")} /{" "}
                {formatMoney(Number(primary.spend_limit_monthly), "USD")}
              </p>
            </section>

            {cards.length > 1 ? (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-white">
                  All cards
                </h2>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-[18px] bg-wise-surface px-4 py-3"
                    >
                      <span className="font-medium text-white">
                        •••• {c.last4}
                      </span>
                      <span className="text-sm capitalize text-wise-mute">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
