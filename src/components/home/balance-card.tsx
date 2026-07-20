"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { formatMoney, formatMoneyParts } from "@/lib/format";
import type { CurrencyCode } from "@/types";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  total: number;
  currency: CurrencyCode;
  hidden: boolean;
  onToggleHide: () => void;
  className?: string;
}

export function BalanceCard({
  total,
  currency,
  hidden,
  onToggleHide,
  className,
}: BalanceCardProps) {
  const parts = formatMoneyParts(total, currency);
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "rounded-[24px] bg-wise-surface-2 px-5 py-6 text-white shadow-lg shadow-black/30",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/70">Total balance</p>
        <button
          type="button"
          onClick={onToggleHide}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wise-surface/10"
          aria-label={hidden ? "Show balances" : "Hide balances"}
        >
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <p className="balance-amount mt-2 text-[40px] font-bold leading-none tracking-tight">
        {hidden ? (
          "••••••"
        ) : (
          <>
            <span className="text-wise-green">{parts.currencySymbol}</span>
            {parts.integer}
            {parts.fraction ? (
              <span className="text-[28px] text-white/70">.{parts.fraction}</span>
            ) : null}
          </>
        )}
      </p>
      <p className="mt-3 text-sm text-white/60">
        Approximate total in {currency}
        {!hidden
          ? ` · ${formatMoney(total, currency, { hideCurrency: true })}`
          : ""}
      </p>
    </motion.div>
  );
}

interface CurrencyRowProps {
  currency: CurrencyCode;
  flag: string;
  name: string;
  amount: number;
  approx: number;
  approxCurrency: CurrencyCode;
  hidden: boolean;
}

export function CurrencyRow({
  currency,
  flag,
  name,
  amount,
  approx,
  approxCurrency,
  hidden,
}: CurrencyRowProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { x: 2 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
    >
      <Link
        href={`/balances/${currency.toLowerCase()}`}
        className="flex items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5 transition-colors hover:bg-wise-surface/80 focus-visible:ring-2 focus-visible:ring-wise-green"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-wise-surface-2 text-xl"
          aria-hidden
        >
          {flag}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-white">
            {currency}
          </span>
          <span className="block text-sm text-wise-mute">{name}</span>
        </span>
        <span className="text-right">
          <span className="balance-amount block text-[15px] font-semibold text-white">
            {hidden ? "••••" : formatMoney(amount, currency)}
          </span>
          <span className="block text-xs text-wise-mute">
            {hidden ? "••••" : `≈ ${formatMoney(approx, approxCurrency)}`}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
