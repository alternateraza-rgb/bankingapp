"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { MainAccountCard } from "@/components/home/main-account-card";
import { TransferCalculator } from "@/components/home/transfer-calculator";
import { TransactionRow } from "@/components/activity/transaction-row";
import { useAppStore } from "@/store/app-store";
import { convertAmount } from "@/lib/exchange";
import { formatMoney } from "@/lib/format";
import { easeOut, PageTransition } from "@/lib/motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const balances = useAppStore((s) => s.balances);
  const transactions = useAppStore((s) => s.transactions);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  const setHideBalances = useAppStore((s) => s.setHideBalances);
  const primary = useAppStore((s) => s.settings.primaryCurrency);
  const reduce = useReducedMotion();

  const total = balances.reduce(
    (sum, b) => sum + convertAmount(b.amount, b.currency, primary),
    0
  );
  const recent = transactions.slice(0, 3);
  // Prefer USD + zero balances for main card grid like screenshot
  const featured = [
    balances.find((b) => b.currency === "USD"),
    balances.find((b) => b.currency === "AED"),
    balances.find((b) => b.currency === "AUD"),
    balances.find((b) => b.currency === "CAD"),
  ].filter(Boolean) as typeof balances;

  return (
    <PageTransition>
      <header className="safe-pt flex items-center gap-2 px-4 pb-3 pt-3">
        <Link
          href="/profile"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wise-surface-2 text-sm font-bold text-white"
          aria-label="Profile"
        >
          {user.avatarInitials}
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-wise-pink ring-2 ring-black" />
        </Link>
        <button
          type="button"
          onClick={() => toast.success("Referral offer opened")}
          className="flex h-9 flex-1 items-center justify-center rounded-full bg-wise-green px-3 text-sm font-bold text-wise-forest"
        >
          Earn £50
        </button>
        <button
          type="button"
          onClick={() => router.push("/balances/usd?action=add")}
          className="flex h-9 items-center gap-1 rounded-full bg-wise-surface-2 px-3.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Open
        </button>
        <button
          type="button"
          onClick={() => router.push("/convert")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-wise-surface-2 text-white"
          aria-label="Insights"
        >
          <BarChart3 className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-8">
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
        >
          <p className="text-sm text-wise-mute">Total balance</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="balance-amount text-[40px] font-bold leading-none tracking-tight text-white">
              {hideBalances ? "••••••" : formatMoney(total, primary)}
            </p>
            <button
              type="button"
              onClick={() => setHideBalances(!hideBalances)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-wise-green"
              aria-label={hideBalances ? "Show balances" : "Hide balances"}
            >
              {hideBalances ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </motion.section>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35, ease: easeOut }}
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Link
            href="/send"
            className="shrink-0 rounded-full bg-wise-green px-5 py-2.5 text-sm font-bold text-wise-forest"
          >
            Send
          </Link>
          <Link
            href="/balances/usd?action=add"
            className="shrink-0 rounded-full bg-wise-surface-2 px-5 py-2.5 text-sm font-semibold text-wise-green"
          >
            Add money
          </Link>
          <button
            type="button"
            onClick={() => router.push("/balances/usd?action=receive")}
            className="flex shrink-0 items-center gap-1 rounded-full bg-wise-surface-2 px-5 py-2.5 text-sm font-semibold text-wise-green"
          >
            Get paid
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => toast.message("Scan to pay")}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-wise-surface-2 px-5 py-2.5 text-sm font-semibold text-wise-green"
          >
            <QrCode className="h-4 w-4" />
            Upload
          </button>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: easeOut }}
        >
          <MainAccountCard
            balances={featured.length ? featured : balances.slice(0, 4)}
            hidden={hideBalances}
            currencyCount={balances.length}
            totalLabel={formatMoney(total, primary)}
          />
          <div className="mt-3 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-wise-surface" />
            <span className="h-1.5 w-1.5 rounded-full bg-wise-mute-2" />
            <span className="h-1.5 w-1.5 rounded-full bg-wise-mute-2" />
          </div>
        </motion.div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tasks</h2>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-wise-surface-2 px-2.5 py-1 text-xs font-semibold text-white"
            >
              2
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-[22px] bg-wise-surface px-4 py-4">
              <p className="text-[15px] font-medium text-white">
                Decide which limits you&apos;d like to edit
              </p>
              <Button
                size="pill"
                onClick={() => router.push("/cards/settings")}
              >
                Review
              </Button>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] bg-wise-surface px-4 py-4">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wise-surface-2">
                <Plus className="h-5 w-5 text-wise-green" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-wise-yellow">
                  <AlertCircle className="h-3 w-3 text-black" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-wise-green">
                  15 USD to your account
                </p>
                <p className="text-sm text-wise-mute">Waiting for you to pay</p>
              </div>
              <Button
                size="pill"
                onClick={() => router.push("/balances/usd?action=add")}
              >
                Review
              </Button>
            </div>
            <p className="px-1 text-sm text-wise-green">
              3 transactions would have taken less time with Instant…
            </p>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Transactions</h2>
            <Link
              href="/activity"
              className="text-sm font-semibold text-wise-green"
            >
              See all
            </Link>
          </div>
          <div className="rounded-[24px] bg-wise-surface px-2 py-1">
            {recent.map((txn) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                hideAmount={hideBalances}
              />
            ))}
          </div>
        </section>

        <TransferCalculator />
      </main>
    </PageTransition>
  );
}
