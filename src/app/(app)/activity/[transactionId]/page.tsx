"use client";

import { use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { useNiroData } from "@/hooks/use-niro-data";
import { formatMoney } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = use(params);
  const { ledger, loading } = useNiroData();
  const entry = ledger.find((e) => e.id === transactionId);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title="Details" showBack backHref="/activity" />
        <main className="px-4 pt-6">
          <Skeleton className="h-40 w-full rounded-[24px]" />
        </main>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-mute">Transaction not found</p>
        <Button asChild>
          <Link href="/activity">Back to activity</Link>
        </Button>
      </div>
    );
  }

  const rows = [
    { label: "Type", value: entry.type },
    { label: "Status", value: entry.status },
    {
      label: "Amount",
      value: formatMoney(Number(entry.amount), entry.currency),
    },
    { label: "Currency", value: entry.currency },
    {
      label: "Date",
      value: format(new Date(entry.created_at), "PPpp"),
    },
    ...(entry.transfer_id
      ? [{ label: "Transfer ID", value: entry.transfer_id }]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Details" showBack backHref="/activity" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="rounded-[28px] bg-wise-surface px-5 py-6 text-center">
          <p className="text-sm text-wise-mute">{entry.subtitle || entry.type}</p>
          <p
            className={`balance-amount mt-2 text-3xl font-semibold ${
              entry.amount >= 0 ? "text-wise-positive" : "text-white"
            }`}
          >
            {entry.amount >= 0 ? "+" : ""}
            {formatMoney(Number(entry.amount), entry.currency)}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{entry.title}</p>
        </div>
        <div className="rounded-[24px] bg-wise-surface p-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3 px-3 py-3"
            >
              <span className="text-sm text-wise-mute">{row.label}</span>
              <span className="max-w-[60%] break-all text-right text-sm font-semibold text-white">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
