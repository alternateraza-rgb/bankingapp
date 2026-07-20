"use client";

import { use } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TransactionStatusBadge } from "@/components/activity/transaction-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/store/app-store";
import { formatMoney, formatRate } from "@/lib/format";
import { toast } from "sonner";
import { List } from "lucide-react";

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = use(params);
  const transaction = useAppStore((s) =>
    s.transactions.find((t) => t.id === transactionId)
  );

  if (!transaction) {
    return (
      <div className="p-4">
        <EmptyState
          icon={List}
          title="Transaction not found"
          description="It may have been removed from your activity."
          actionLabel="Back to activity"
          onAction={() => {
            window.location.href = "/activity";
          }}
        />
      </div>
    );
  }

  const rows = [
    { label: "Merchant / recipient", value: transaction.merchantOrRecipient },
    {
      label: "Date & time",
      value: format(new Date(transaction.date), "PPpp"),
    },
    {
      label: "Amount",
      value: formatMoney(transaction.amount, transaction.currency),
    },
    transaction.convertedAmount != null && transaction.convertedCurrency
      ? {
          label: "Converted amount",
          value: formatMoney(
            transaction.convertedAmount,
            transaction.convertedCurrency
          ),
        }
      : null,
    {
      label: "Fee",
      value: formatMoney(transaction.fee, transaction.feeCurrency),
    },
    transaction.exchangeRate
      ? {
          label: "Exchange rate",
          value: formatRate(
            transaction.exchangeRate,
            transaction.currency,
            transaction.convertedCurrency ?? transaction.currency
          ),
        }
      : null,
    { label: "Reference", value: transaction.reference },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Details" showBack backHref="/activity" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface p-5 text-center">
          <p className="text-sm text-wise-mute">{transaction.subtitle}</p>
          <p className="balance-amount mt-2 text-3xl font-bold text-white">
            {formatMoney(transaction.amount, transaction.currency)}
          </p>
          <div className="mt-3 flex justify-center">
            <TransactionStatusBadge status={transaction.status} />
          </div>
        </div>

        <div className="rounded-[24px] bg-wise-surface p-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 px-3 py-3"
            >
              <span className="text-sm text-wise-mute">{row.label}</span>
              <span className="max-w-[60%] text-right text-sm font-semibold text-white">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            toast.success("Receipt downloaded")
          }
        >
          <Download className="h-4 w-4" aria-hidden />
          Download receipt
        </Button>
        <p className="text-center text-xs text-wise-mute" aria-live="polite">
          
        </p>
      </main>
    </div>
  );
}
