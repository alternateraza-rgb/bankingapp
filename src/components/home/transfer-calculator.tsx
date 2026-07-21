"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { CURRENCY_META } from "@/lib/currencies";

const OPTIONS: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "PHP",
  "PKR",
  "AED",
  "AUD",
  "CAD",
  "CNY",
];

/** Lightweight FX sketch — not wired to live rates. Safe if unused on home. */
export function TransferCalculator() {
  const router = useRouter();
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("EUR");
  const [amountStr, setAmountStr] = useState("100");

  const amount = Number(amountStr.replace(/,/g, "")) || 0;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const send = () => {
    setTransferDraft({
      sourceCurrency: from,
      targetCurrency: to,
      sourceAmount: amount,
    });
    router.push("/send");
  };

  return (
    <section className="space-y-3">
      <h2 className="text-[22px] font-bold tracking-tight text-white">
        Quick convert
      </h2>
      <div className="rounded-[28px] bg-wise-surface p-4">
        <p className="text-sm text-wise-mute">
          Estimate only — use Convert for live wallet FX.
        </p>
        <div className="relative mt-4 space-y-2">
          <CalcRow
            value={amountStr}
            onChange={setAmountStr}
            currency={from}
            onCurrencyChange={setFrom}
            editable
          />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={swap}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-wise-surface-2 text-white"
              aria-label="Swap currencies"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>
          <CalcRow
            value={amount > 0 ? String(amount) : "0"}
            onChange={() => undefined}
            currency={to}
            onCurrencyChange={setTo}
            editable={false}
          />
        </div>
        <p className="mt-3 text-xs text-wise-mute">
          From {formatMoney(amount, from)}
        </p>
        <Button className="mt-5 w-full" size="lg" onClick={send}>
          Send
        </Button>
      </div>
    </section>
  );
}

function CalcRow({
  value,
  onChange,
  currency,
  onCurrencyChange,
  editable,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  editable: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] bg-black px-4 py-3.5">
      <input
        value={value}
        readOnly={!editable}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9.,]/g, "");
          onChange(next);
        }}
        className={cn(
          "balance-amount min-w-0 flex-1 bg-transparent text-[28px] font-semibold tracking-tight text-white outline-none",
          !editable && "cursor-default"
        )}
        inputMode="decimal"
        aria-label={editable ? "You send" : "Recipient gets"}
      />
      <label className="relative shrink-0">
        <span className="flex h-10 items-center gap-1.5 rounded-full bg-wise-surface-2 pl-2.5 pr-2 text-sm font-semibold text-white">
          <span aria-hidden>{CURRENCY_META[currency]?.flag ?? "💱"}</span>
          {currency}
          <span className="text-wise-mute">▾</span>
        </span>
        <select
          className="absolute inset-0 cursor-pointer opacity-0"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          aria-label="Currency"
        >
          {OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_META[c]?.flag} {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
