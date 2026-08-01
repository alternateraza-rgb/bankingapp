"use client";

import { useMemo, useState, useTransition } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { RefreshCw, Search } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TransactionRow } from "@/components/activity/transaction-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import type { TransactionType } from "@/types";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

const filters: { id: "all" | TransactionType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transfer", label: "Transfers" },
  { id: "card", label: "Card" },
  { id: "conversion", label: "Conversions" },
  { id: "deposit", label: "Deposits" },
];

export default function ActivityPage() {
  const transactions = useAppStore((s) => s.transactions);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q)
      );
    });
  }, [transactions, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const d = parseISO(t.date);
      const key = format(d, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const refresh = () => {
    setRefreshing(true);
    startTransition(() => {
      setTimeout(() => setRefreshing(false), 700);
    });
  };

  const labelFor = (key: string) => {
    const d = parseISO(key);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMM d");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title="Activity"
        showBack
        backHref="/home"
        rightSlot={
          <button
            type="button"
            onClick={refresh}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Refresh activity"
          >
            <RefreshCw
              className={cn("h-5 w-5", refreshing && "animate-spin")}
            />
          </button>
        }
      />
      <main className="flex flex-1 flex-col px-4 pb-6">
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions"
            className="pl-10"
            aria-label="Search transactions"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                filter === f.id
                  ? "bg-white text-black"
                  : "bg-wise-surface text-wise-mute"
              )}
              aria-pressed={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={List}
            title="No activity found"
            description="Try another filter or search term."
          />
        ) : (
          <div className="space-y-5">
            {groups.map(([key, items]) => (
              <section key={key}>
                <h3 className="mb-1 px-1 text-sm font-semibold text-wise-mute">
                  {labelFor(key)}
                </h3>
                <div className="rounded-[24px] bg-wise-surface px-3 py-1">
                  {items.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      hideAmount={hideBalances}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
