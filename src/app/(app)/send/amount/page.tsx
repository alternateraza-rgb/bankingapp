"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { useNiroData } from "@/hooks/use-niro-data";
import { formatMoney } from "@/lib/format";
import { CURRENCY_META } from "@/lib/currencies";
import type { CurrencyCode } from "@/types";
import { toast } from "sonner";

const STEPS = ["Recipient", "Amount", "Review", "Done"];

export default function SendAmountPage() {
  const router = useRouter();
  const draft = useAppStore((s) => s.transferDraft);
  const sendTarget = useAppStore((s) => s.sendTarget);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const { wallets, loading } = useNiroData();

  const [amountStr, setAmountStr] = useState(
    draft.sourceAmount > 0 ? String(draft.sourceAmount) : ""
  );
  const [note, setNote] = useState(draft.note ?? "");

  useEffect(() => {
    if (!sendTarget) return;
    if (wallets.length === 0) return;
    const has = wallets.some((w) => w.currency === draft.sourceCurrency);
    if (!has) {
      setTransferDraft({
        sourceCurrency: wallets[0].currency as CurrencyCode,
        targetCurrency: wallets[0].currency as CurrencyCode,
      });
    }
  }, [wallets, draft.sourceCurrency, sendTarget, setTransferDraft]);

  if (!sendTarget) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-mute">Choose a recipient first</p>
        <Button asChild>
          <Link href="/send">Back to send</Link>
        </Button>
      </div>
    );
  }

  const amount = Number(amountStr) || 0;
  const wallet = wallets.find((w) => w.currency === draft.sourceCurrency);
  const currencyOptions = (wallets.map((w) => w.currency) as CurrencyCode[]) || [
    "USD",
  ];

  const continueNext = () => {
    if (amount <= 0) {
      toast.error("Enter an amount to send");
      return;
    }
    if (wallet && amount > Number(wallet.balance)) {
      toast.error("Insufficient balance");
      return;
    }
    setTransferDraft({
      sourceAmount: amount,
      targetCurrency: draft.sourceCurrency,
      paymentMethod: "balance",
      note,
    });
    router.push("/send/review");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Amount" showBack backHref="/send" />
      <StepProgress steps={STEPS} current={1} className="mb-4" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <div className="flex items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wise-surface-2 text-sm font-bold">
            {sendTarget.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">
              {sendTarget.fullName}
            </p>
            <p className="text-sm text-wise-mute">@{sendTarget.handle}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-wise-mute">You send</p>
          <label className="relative">
            <span className="flex h-10 items-center gap-1.5 rounded-full bg-wise-surface-2 px-3 text-sm font-semibold text-white">
              {CURRENCY_META[draft.sourceCurrency]?.flag ?? "💱"}{" "}
              {draft.sourceCurrency}
              <span className="text-wise-mute">▾</span>
            </span>
            <select
              className="absolute inset-0 cursor-pointer opacity-0"
              value={draft.sourceCurrency}
              onChange={(e) =>
                setTransferDraft({
                  sourceCurrency: e.target.value as CurrencyCode,
                  targetCurrency: e.target.value as CurrencyCode,
                })
              }
              aria-label="Currency"
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <MoneyInput
          label="Amount"
          value={amountStr}
          onChange={setAmountStr}
          currency={draft.sourceCurrency}
        />

        <p className="text-xs text-wise-mute">
          Available:{" "}
          {loading
            ? "…"
            : wallet
              ? formatMoney(Number(wallet.balance), wallet.currency)
              : "—"}
        </p>

        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            className="mt-1.5"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's this for?"
            maxLength={120}
          />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={continueNext}>
          Continue to review
        </Button>
      </div>
    </div>
  );
}
