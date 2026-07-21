"use client";

import { use, useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNiroData } from "@/hooks/use-niro-data";
import { useAppStore } from "@/store/app-store";
import { topupWallet } from "@/services/niro";
import { formatMoney } from "@/lib/format";
import { CURRENCY_META } from "@/lib/currencies";
import { toast } from "sonner";

export default function BalanceDetailPage({
  params,
}: {
  params: Promise<{ currency: string }>;
}) {
  const { currency: raw } = use(params);
  const currency = raw.toUpperCase();
  const { wallets, ledger, loading, refresh } = useNiroData();
  const hideBalances = useAppStore((s) => s.hideBalances);
  const [amountStr, setAmountStr] = useState("100");
  const [busy, setBusy] = useState(false);

  const wallet = wallets.find((w) => w.currency === currency);
  const meta = CURRENCY_META[currency] ?? {
    name: currency,
    flag: "💱",
    symbol: currency,
  };
  const entries = ledger.filter((e) => e.currency === currency).slice(0, 12);

  const topup = async () => {
    const amount = Number(amountStr) || 0;
    if (amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setBusy(true);
    try {
      await topupWallet(currency, amount);
      await refresh();
      toast.success(`Added ${formatMoney(amount, currency)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title={`${meta.flag} ${currency}`}
        showBack
        backHref="/home"
      />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-10">
        <section className="rounded-[28px] bg-wise-surface px-5 py-6">
          <p className="text-sm text-wise-mute">{meta.name}</p>
          {loading ? (
            <p className="mt-2 text-3xl text-wise-mute">…</p>
          ) : (
            <p className="balance-amount mt-1 text-4xl font-semibold text-white">
              {hideBalances
                ? "••••••"
                : formatMoney(Number(wallet?.balance ?? 0), currency)}
            </p>
          )}
          {wallet?.account_number ? (
            <p className="mt-2 text-xs text-wise-mute-2">
              Acct · {wallet.account_number}
            </p>
          ) : null}
        </section>

        <section className="rounded-[24px] bg-wise-surface p-4">
          <h2 className="text-sm font-semibold text-white">Demo top-up</h2>
          <p className="mt-1 text-xs text-wise-mute">
            Instantly credit this wallet (sandbox).
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              inputMode="decimal"
              value={amountStr}
              onChange={(e) =>
                setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))
              }
              aria-label="Top-up amount"
            />
            <Button onClick={topup} disabled={busy} className="shrink-0">
              {busy ? "…" : "Add"}
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Activity</h2>
            <Link href="/activity" className="text-sm text-wise-mute">
              See all
            </Link>
          </div>
          <div className="rounded-[24px] bg-wise-surface px-2 py-1">
            {entries.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-wise-mute">
                No activity in {currency}
              </p>
            ) : (
              entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/activity/${entry.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-white">
                      {entry.title}
                    </span>
                    <span className="block truncate text-sm text-wise-mute">
                      {entry.subtitle}
                    </span>
                  </span>
                  <span
                    className={`balance-amount shrink-0 text-sm font-semibold ${
                      entry.amount >= 0 ? "text-wise-positive" : "text-white"
                    }`}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {formatMoney(Number(entry.amount), entry.currency)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
