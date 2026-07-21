"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Send,
  Bitcoin,
} from "lucide-react";
import { CryptoIcon } from "@/components/crypto/crypto-icon";
import { useAuth } from "@/components/auth-provider";
import { useNiroData } from "@/hooks/use-niro-data";
import { useAppStore } from "@/store/app-store";
import { formatMoney } from "@/lib/format";
import { CURRENCY_META } from "@/lib/currencies";
import { easeOut } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { profile } = useAuth();
  const { wallets, ledger, holdings, loading, refresh } = useNiroData();
  const hideBalances = useAppStore((s) => s.hideBalances);
  const setHideBalances = useAppStore((s) => s.setHideBalances);
  const reduce = useReducedMotion();

  const approxUsd: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    PKR: 0.0036,
    CNY: 0.14,
    AED: 0.27,
    AUD: 0.66,
    CAD: 0.74,
    PHP: 0.017,
  };
  const total = wallets.reduce(
    (sum, w) => sum + Number(w.balance) * (approxUsd[w.currency] ?? 1),
    0
  );

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full min-w-0 max-w-full px-4 pb-8 pt-2 sm:max-w-[430px] sm:px-5">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
        className="flex items-center gap-3"
      >
        <Link
          href="/profile"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wise-surface-2 text-sm font-bold text-white"
        >
          {profile?.avatar_initials ?? "N"}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-wise-mute">Good to see you</p>
          <p className="truncate text-lg font-semibold text-white">{firstName}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-wise-surface-2 text-white"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </motion.header>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: easeOut }}
        className="mt-8"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm text-wise-mute">Total balance</p>
          <button
            type="button"
            onClick={() => setHideBalances(!hideBalances)}
            className="text-wise-mute"
            aria-label={hideBalances ? "Show balances" : "Hide balances"}
          >
            {hideBalances ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-12 w-48" />
        ) : (
          <p className="balance-amount mt-1 text-4xl font-semibold tracking-tight text-white">
            {hideBalances ? "••••••" : formatMoney(total, "USD")}
          </p>
        )}
        {profile?.handle ? (
          <p className="mt-1 text-sm text-wise-mute">@{profile.handle}</p>
        ) : null}
      </motion.section>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.35, ease: easeOut }}
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
      >
        {[
          { href: "/send", label: "Send", icon: Send },
          { href: "/receive", label: "Receive", icon: ArrowUpRight },
          { href: "/convert", label: "Convert", icon: RefreshCw },
          { href: "/crypto", label: "Crypto", icon: Bitcoin },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </motion.div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Accounts</h2>
          <Link href="/balances/USD" className="text-sm text-wise-mute">
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
              ))
            : wallets.map((w, i) => {
                const meta = CURRENCY_META[w.currency] ?? {
                  name: w.currency,
                  flag: "💱",
                };
                return (
                  <motion.div
                    key={w.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3, ease: easeOut }}
                  >
                    <Link
                      href={`/balances/${w.currency}`}
                      className="flex items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5 transition-colors hover:bg-wise-surface-2"
                    >
                      <span className="text-2xl">{meta.flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{w.currency}</p>
                        <p className="truncate text-sm text-wise-mute">
                          {meta.name}
                        </p>
                      </div>
                      <p className="balance-amount font-semibold text-white">
                        {hideBalances
                          ? "••••"
                          : formatMoney(Number(w.balance), w.currency)}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
        </div>
      </section>

      {holdings.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Crypto</h2>
            <Link href="/crypto" className="text-sm text-wise-mute">
              Markets
            </Link>
          </div>
          <div className="space-y-2">
            {holdings.map((h) => (
              <Link
                key={h.id}
                href={`/crypto/${h.asset.toLowerCase()}`}
                className="flex items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5"
              >
                <CryptoIcon asset={h.asset} size={36} />
                <span className="font-semibold text-white">{h.asset}</span>
                <span className="ml-auto text-sm text-wise-mute">
                  {Number(h.quantity).toFixed(6)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Activity</h2>
          <Link href="/activity" className="text-sm text-wise-mute">
            See all
          </Link>
        </div>
        <div className="rounded-[24px] bg-wise-surface px-2 py-1">
          {loading ? (
            <Skeleton className="m-2 h-14" />
          ) : ledger.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Plus className="h-5 w-5 text-wise-mute" />
              <p className="text-sm text-wise-mute">No activity yet</p>
            </div>
          ) : (
            ledger.slice(0, 6).map((entry) => (
              <Link
                key={entry.id}
                href={`/activity/${entry.id}`}
                className="flex items-center gap-3 px-3 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wise-surface-2 text-xs font-bold text-white">
                  {entry.amount >= 0 ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{entry.title}</p>
                  <p className="truncate text-sm text-wise-mute">
                    {entry.subtitle}
                  </p>
                </div>
                <p
                  className={`balance-amount text-sm font-semibold ${
                    entry.amount >= 0 ? "text-wise-positive" : "text-white"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {formatMoney(Number(entry.amount), entry.currency)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
