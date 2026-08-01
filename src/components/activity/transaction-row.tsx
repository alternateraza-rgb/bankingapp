"use client";

import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  CircleDollarSign,
} from "lucide-react";
import type { Transaction, TransactionStatus, TransactionType } from "@/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const iconMap: Record<TransactionType, typeof ArrowUpRight> = {
  transfer: ArrowUpRight,
  conversion: ArrowLeftRight,
  card: CreditCard,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  fee: CircleDollarSign,
  custom: CircleDollarSign,
  purchase: CreditCard,
  income: ArrowDownLeft,
  refund: ArrowDownLeft,
};

const statusLabel: Record<TransactionStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Declined",
  refunded: "Refunded",
};

export function TransactionStatusBadge({
  status,
}: {
  status: TransactionStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "completed" && "bg-wise-green-dim text-wise-green",
        status === "pending" && "bg-wise-surface-3 text-wise-yellow",
        status === "failed" && "bg-red-500/15 text-wise-negative",
        status === "refunded" && "bg-wise-surface-3 text-wise-cyan"
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

interface TransactionRowProps {
  transaction: Transaction;
  hideAmount?: boolean;
}

export function TransactionRow({
  transaction,
  hideAmount,
}: TransactionRowProps) {
  const Icon = iconMap[transaction.type] ?? CircleDollarSign;
  const positive = transaction.amount > 0;
  const date = new Date(transaction.date);
  const logo = transaction.vendorLogoUrl || transaction.icon;
  const meta =
    transaction.status === "failed"
      ? `Declined · ${dayLabel(date)}`
      : transaction.status === "pending"
        ? `Pending · ${dayLabel(date)}`
        : `${transaction.subtitle} · ${dayLabel(date)}`;

  const amountLabel = hideAmount
    ? "••••"
    : positive
      ? `+${formatMoney(transaction.amount, transaction.currency)}`
      : formatMoney(transaction.amount, transaction.currency);

  return (
    <Link
      href={`/activity/${transaction.id}`}
      className="flex items-center gap-3 rounded-2xl px-2 py-3.5 transition-colors hover:bg-wise-surface/5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wise-surface-2 text-white">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-5 w-5" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-white">
          {transaction.title}
        </span>
        <span className="block text-sm text-wise-mute">{meta}</span>
      </span>
      <span
        className={cn(
          "balance-amount text-[15px] font-semibold",
          positive ? "text-wise-green" : "text-white"
        )}
      >
        {amountLabel}
      </span>
    </Link>
  );
}
