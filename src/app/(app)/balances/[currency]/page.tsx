"use client";

import { use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Copy,
  Plus,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ActionButton } from "@/components/home/action-button";
import { TransactionRow } from "@/components/activity/transaction-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/types";
import { toast } from "sonner";
import { List } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/skeleton";

const VALID: CurrencyCode[] = ["USD", "EUR", "GBP", "PKR", "CNY", "AED", "AUD", "CAD", "PHP"];

export default function BalanceDetailPage({
  params,
}: {
  params: Promise<{ currency: string }>;
}) {
  const { currency: raw } = use(params);
  const currency = raw.toUpperCase() as CurrencyCode;
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const balances = useAppStore((s) => s.balances);
  const transactions = useAppStore((s) => s.transactions);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  const addMoney = useAppStore((s) => s.addMoney);

  const [addOpen, setAddOpen] = useState(action === "add");
  const [receiveOpen, setReceiveOpen] = useState(action === "receive");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);

  const balance = balances.find((b) => b.currency === currency);

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.currency === currency || t.convertedCurrency === currency
      ),
    [transactions, currency]
  );

  const summary = useMemo(() => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    let incoming = 0;
    let outgoing = 0;
    for (const t of filtered) {
      const d = new Date(t.date);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      if (t.currency !== currency) continue;
      if (t.amount > 0) incoming += t.amount;
      else outgoing += Math.abs(t.amount);
    }
    return { incoming, outgoing };
  }, [filtered, currency]);

  if (!VALID.includes(currency) || !balance) {
    return (
      <div className="p-4">
        <EmptyState
          icon={List}
          title="Currency not found"
          description="Choose a balance from the home screen."
          actionLabel="Go home"
          onAction={() => {
            window.location.href = "/home";
          }}
        />
      </div>
    );
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleAdd = () => {
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      addMoney(currency, n);
      setLoading(false);
      setAddOpen(false);
      toast.success("Money added");
    }, 500);
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title={`${currency} balance`}
        showBack
        backHref="/home"
      />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface p-5">
          <p className="text-sm text-wise-mute">{balance.name}</p>
          <p className="balance-amount mt-2 text-4xl font-bold text-white">
            {hideBalances ? "••••••" : formatMoney(balance.amount, currency)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-wise-surface-2 p-3">
              <p className="text-xs text-wise-mute">In this month</p>
              <p className="font-semibold text-wise-positive">
                {formatMoney(summary.incoming, currency)}
              </p>
            </div>
            <div className="rounded-2xl bg-wise-surface-2 p-3">
              <p className="text-xs text-wise-mute">Out this month</p>
              <p className="font-semibold text-white">
                {formatMoney(summary.outgoing, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wise-green text-wise-forest">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold">Add</span>
          </button>
          <ActionButton href="/send" icon={ArrowUpRight} label="Send" />
          <ActionButton href="/convert" icon={ArrowLeftRight} label="Convert" />
          <button
            type="button"
            onClick={() => setReceiveOpen(true)}
            className="flex flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wise-green text-wise-forest">
              <ArrowDownLeft className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold">Receive</span>
          </button>
        </div>

        <section className="rounded-[24px] bg-wise-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-white">Account details</h3>
            <span className="rounded-full bg-wise-yellow/60 px-2 py-0.5 text-[10px] font-bold text-[#4a3b1c]">
              Account details
            </span>
          </div>
          <DetailRow
            label="Account holder"
            value={balance.accountHolder}
            onCopy={() => copy("Account holder", balance.accountHolder)}
          />
          <DetailRow
            label="Account number"
            value={balance.accountNumber}
            onCopy={() => copy("Account number", balance.accountNumber)}
          />
          {balance.iban ? (
            <DetailRow
              label="IBAN"
              value={balance.iban}
              onCopy={() => copy("IBAN", balance.iban!)}
            />
          ) : null}
          {balance.routingOrSort ? (
            <DetailRow
              label="Routing / sort"
              value={balance.routingOrSort}
              onCopy={() => copy("Routing", balance.routingOrSort!)}
            />
          ) : null}
          <DetailRow
            label="Bank"
            value={balance.bankName}
            onCopy={() => copy("Bank", balance.bankName)}
          />
        </section>

        <section>
          <h3 className="mb-2 font-bold text-white">Transactions</h3>
          {loading ? (
            <div className="space-y-2">
              <SkeletonLoader className="h-16" />
              <SkeletonLoader className="h-16" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={List}
              title="No transactions yet"
              description={`Activity in ${currency} will show up here.`}
            />
          ) : (
            <div className="rounded-[24px] bg-wise-surface px-3 py-1">
              {filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  hideAmount={hideBalances}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomSheet open={addOpen} onOpenChange={setAddOpen} title="Add money">
        <p className="mb-3 text-sm text-wise-body">
          Add money to your {currency} balance.
        </p>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount to add"
        />
        <Button className="mt-4 w-full" onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : `Add ${currency}`}
        </Button>
      </BottomSheet>

      <BottomSheet
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Receive money"
      >
        <p className="mb-3 text-sm text-wise-body">
          Share these account details so others can send money to this balance.
        </p>
        <div className="rounded-2xl bg-wise-surface-2 p-4 text-sm">
          <p className="font-semibold">{balance.accountHolder}</p>
          <p className="mt-1 text-wise-mute">{balance.accountNumber}</p>
          {balance.iban ? (
            <p className="mt-1 text-wise-mute">{balance.iban}</p>
          ) : null}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() =>
            copy(
              "Details",
              `${balance.accountHolder}\n${balance.accountNumber}${balance.iban ? `\n${balance.iban}` : ""}`
            )
          }
        >
          Copy details
        </Button>
      </BottomSheet>
    </div>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-wise-mute">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-wise-surface-2"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
