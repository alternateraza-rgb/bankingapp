"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { useNiroData } from "@/hooks/use-niro-data";
import { convertFiat } from "@/services/niro";
import { formatMoney } from "@/lib/format";
import { CURRENCY_META } from "@/lib/currencies";
import type { CurrencyCode } from "@/types";
import { toast } from "sonner";

export default function ConvertPage() {
  const { wallets, loading, refresh } = useNiroData();
  const currencies = useMemo(
    () => wallets.map((w) => w.currency as CurrencyCode),
    [wallets]
  );

  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("EUR");
  const [amountStr, setAmountStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    from: string;
    to: string;
    amount: number;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!currencies.length || hydrated) return;
    setFrom(currencies[0]);
    setTo(currencies.find((c) => c !== currencies[0]) ?? currencies[0]);
    setHydrated(true);
  }, [currencies, hydrated]);

  const amount = Number(amountStr) || 0;
  const fromWallet = wallets.find((w) => w.currency === from);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const submit = async () => {
    if (amount <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (from === to) {
      toast.error("Pick two different currencies");
      return;
    }
    if (fromWallet && amount > Number(fromWallet.balance)) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    try {
      await convertFiat(from, to, amount);
      await refresh();
      setDone({ from, to, amount });
      setAmountStr("");
      toast.success("Converted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title="Converted" showBack backHref="/home" />
        <main className="flex flex-1 flex-col items-center px-4 pb-8 pt-10 text-center">
          <h2 className="text-2xl font-bold text-white">Conversion complete</h2>
          <p className="mt-2 text-sm text-wise-mute">
            {formatMoney(done.amount, done.from)} → {done.to}
          </p>
          <Button className="mt-8 w-full" onClick={() => setDone(null)}>
            Convert again
          </Button>
          <Button className="mt-3 w-full" variant="secondary" asChild>
            <Link href="/home">Home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Convert" showBack backHref="/home" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-wise-mute">From</p>
            <CurrencyPick
              value={from}
              options={currencies}
              onChange={setFrom}
            />
          </div>
          <MoneyInput
            label="Amount"
            value={amountStr}
            onChange={setAmountStr}
            currency={from}
          />
          <p className="text-xs text-wise-mute">
            Available:{" "}
            {loading
              ? "…"
              : fromWallet
                ? formatMoney(Number(fromWallet.balance), from)
                : "—"}
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-wise-surface-2 text-white"
              aria-label="Swap"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-wise-mute">To</p>
            <CurrencyPick value={to} options={currencies} onChange={setTo} />
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 w-full max-w-full border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={submit} disabled={busy || loading}>
          {busy ? "Converting…" : "Convert"}
        </Button>
      </div>
    </div>
  );
}

function CurrencyPick({
  value,
  options,
  onChange,
}: {
  value: CurrencyCode;
  options: CurrencyCode[];
  onChange: (c: CurrencyCode) => void;
}) {
  const list = options.length ? options : (["USD"] as CurrencyCode[]);
  return (
    <label className="relative">
      <span className="flex h-10 items-center gap-1.5 rounded-full bg-wise-surface-2 px-3 text-sm font-semibold text-white">
        {CURRENCY_META[value]?.flag ?? "💱"} {value}
        <span className="text-wise-mute">▾</span>
      </span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
      >
        {list.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
