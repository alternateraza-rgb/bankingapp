"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Settings, Wallet } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { VirtualCard } from "@/components/cards/virtual-card";
import { TransactionRow } from "@/components/activity/transaction-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppStore } from "@/store/app-store";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import type { Card } from "@/types";
import { cn } from "@/lib/utils";

type Network = Card["network"];

export default function CardsPage() {
  const cards = useAppStore((s) => s.cards);
  const card = useAppStore((s) => s.card);
  const activeCardId = useAppStore((s) => s.activeCardId);
  const setActiveCardId = useAppStore((s) => s.setActiveCardId);
  const updateCard = useAppStore((s) => s.updateCard);
  const createRandomCard = useAppStore((s) => s.createRandomCard);
  const createCustomCard = useAppStore((s) => s.createCustomCard);
  const transactions = useAppStore((s) => s.transactions);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);

  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [busy, setBusy] = useState(false);
  const [network, setNetwork] = useState<Network>("visa");
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#163300");
  const [cardholderName, setCardholderName] = useState("");
  const [fullNumber, setFullNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const cardTxns = transactions
    .filter((t) => t.type === "card" || t.cardId === card.id)
    .slice(0, 5);
  const pct = Math.min(
    100,
    Math.round((card.spendingUsed / Math.max(card.spendingLimit, 1)) * 100)
  );

  const resetForm = () => {
    setMode("random");
    setNetwork("visa");
    setNickname("");
    setColor("#163300");
    setCardholderName("");
    setFullNumber("");
    setExpiry("");
    setCvv("");
  };

  const onCreate = async () => {
    setBusy(true);
    try {
      if (mode === "random") {
        await createRandomCard({ network, nickname, color });
        toast.success("Virtual card created");
      } else {
        if (cardholderName.trim().length < 2) {
          toast.error("Enter a cardholder name");
          return;
        }
        await createCustomCard({
          cardholderName,
          network,
          fullNumber: fullNumber || undefined,
          expiry: expiry || undefined,
          cvv: cvv || undefined,
          nickname,
          color,
        });
        toast.success("Custom card added");
      }
      setAddOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title="Cards"
        showBack
        backHref="/home"
        rightSlot={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="Add card"
            >
              <Plus className="h-5 w-5" />
            </button>
            <Link
              href="/cards/settings"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="Card settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        }
      />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-8">
        {cards.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCardId(c.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  c.id === activeCardId
                    ? "bg-wise-green text-black"
                    : "bg-wise-surface text-wise-mute"
                )}
              >
                {c.nickname?.trim() || `···${c.last4}`}
              </button>
            ))}
          </div>
        ) : null}

        {cards.length === 0 ? (
          <div className="rounded-[24px] bg-wise-surface px-5 py-10 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-wise-mute" />
            <p className="mt-3 font-semibold text-white">No cards yet</p>
            <p className="mt-1 text-sm text-wise-mute">
              Generate a virtual card or add a custom one — saved to your account.
            </p>
            <Button className="mt-5" onClick={() => setAddOpen(true)}>
              Add your first card
            </Button>
          </div>
        ) : (
          <>
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

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="w-full" onClick={() => setAddOpen(true)}>
                <CreditCard className="h-4 w-4" aria-hidden />
                Add card
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  toast.message("Apple Wallet", {
                    description: "Opening Apple Wallet…",
                  })
                }
              >
                <Wallet className="h-4 w-4" aria-hidden />
                Apple Wallet
              </Button>
            </div>
          </>
        )}

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
            {cardTxns.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-wise-mute">
                No card spend yet
              </p>
            ) : (
              cardTxns.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  hideAmount={hideBalances}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <BottomSheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetForm();
        }}
        title="Add a card"
      >
        <div className="mb-4 flex gap-2">
          {(
            [
              ["random", "Random virtual"],
              ["custom", "Custom card"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold",
                mode === id
                  ? "bg-wise-green text-black"
                  : "bg-wise-surface-2 text-wise-mute"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="network">Network</Label>
            <select
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
              className="mt-1.5 w-full rounded-2xl border border-wise-border bg-wise-surface-2 px-3 py-3 text-sm text-white"
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">Amex</option>
              <option value="discover">Discover</option>
            </select>
          </div>
          <div>
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Travel"
            />
          </div>
          <div>
            <Label htmlFor="color">Card color</Label>
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-12 cursor-pointer p-1"
            />
          </div>

          {mode === "custom" ? (
            <>
              <div>
                <Label htmlFor="cardholder">Cardholder name</Label>
                <Input
                  id="cardholder"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Full name on card"
                />
              </div>
              <div>
                <Label htmlFor="number">Card number (optional)</Label>
                <Input
                  id="number"
                  inputMode="numeric"
                  value={fullNumber}
                  onChange={(e) => setFullNumber(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="•••"
                  />
                </div>
              </div>
            </>
          ) : null}

          <Button className="w-full" disabled={busy} onClick={onCreate}>
            {busy ? "Creating…" : mode === "random" ? "Generate card" : "Add custom card"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
