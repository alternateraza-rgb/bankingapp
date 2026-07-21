"use client";

import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useNiroData } from "@/hooks/use-niro-data";
import { useAppStore } from "@/store/app-store";
import { formatMoney } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ActivityPage() {
  const { ledger, loading } = useNiroData();
  const hideBalances = useAppStore((s) => s.hideBalances);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Activity" showBack backHref="/home" />
      <main className="flex flex-1 flex-col px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface px-2 py-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <p className="px-3 py-12 text-center text-sm text-wise-mute">
              No activity yet
            </p>
          ) : (
            ledger.map((entry) => (
              <Link
                key={entry.id}
                href={`/activity/${entry.id}`}
                className="flex items-center gap-3 px-3 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wise-surface-2 text-xs font-bold text-white">
                  {entry.amount >= 0 ? "+" : "−"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">
                    {entry.title}
                  </span>
                  <span className="block truncate text-sm text-wise-mute">
                    {entry.subtitle ||
                      format(new Date(entry.created_at), "MMM d, yyyy")}
                  </span>
                </span>
                <span
                  className={`balance-amount shrink-0 text-sm font-semibold ${
                    entry.amount >= 0 ? "text-wise-positive" : "text-white"
                  }`}
                >
                  {hideBalances
                    ? "••••"
                    : `${entry.amount >= 0 ? "+" : ""}${formatMoney(
                        Number(entry.amount),
                        entry.currency
                      )}`}
                </span>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
