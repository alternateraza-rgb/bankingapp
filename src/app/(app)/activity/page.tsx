"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { List, Plus, RefreshCw, Search } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TransactionRow } from "@/components/activity/transaction-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppStore } from "@/store/app-store";
import type { CurrencyCode, TransactionType } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  fetchCloudTransactions,
  isSupabaseConfigured,
  uploadVendorLogo,
} from "@/services/wise-cloud";

const filters: { id: "all" | TransactionType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transfer", label: "Transfers" },
  { id: "card", label: "Card" },
  { id: "custom", label: "Custom" },
  { id: "conversion", label: "Conversions" },
  { id: "deposit", label: "Deposits" },
];

const currencies: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "PKR",
  "CNY",
  "AED",
  "AUD",
  "CAD",
  "PHP",
];

export default function ActivityPage() {
  const transactions = useAppStore((s) => s.transactions);
  const cards = useAppStore((s) => s.cards);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  const addCustomTransaction = useAppStore((s) => s.addCustomTransaction);
  const mergeCloudData = useAppStore((s) => s.mergeCloudData);

  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [vendorName, setVendorName] = useState("");
  const [vendorLogoUrl, setVendorLogoUrl] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [subtitle, setSubtitle] = useState("");
  const [cardId, setCardId] = useState<string>("");
  const [affectBalance, setAffectBalance] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = new URLSearchParams(window.location.search).get("filter");
    if (f && filters.some((x) => x.id === f)) {
      setFilter(f as (typeof filters)[number]["id"]);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === "custom") {
        if (!(t.isCustom || t.type === "custom" || t.type === "purchase" || t.type === "income")) {
          return false;
        }
      } else if (filter !== "all" && t.type !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.vendorName?.toLowerCase().includes(q) ?? false)
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
    startTransition(async () => {
      try {
        if (isSupabaseConfigured()) {
          const cloud = await fetchCloudTransactions();
          mergeCloudData({ transactions: cloud });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Refresh failed");
      } finally {
        setRefreshing(false);
      }
    });
  };

  const labelFor = (key: string) => {
    const d = parseISO(key);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMM d");
  };

  const resetForm = () => {
    setAmount("");
    setCurrency("USD");
    setVendorName("");
    setVendorLogoUrl("");
    setDirection("debit");
    setSubtitle("");
    setCardId("");
    setAffectBalance(true);
  };

  const onAddCustom = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!vendorName.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    setBusy(true);
    try {
      await addCustomTransaction({
        amount: value,
        currency,
        vendorName: vendorName.trim(),
        direction,
        vendorLogoUrl: vendorLogoUrl.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        cardId: cardId || undefined,
        affectBalance,
        type: "custom",
      });
      toast.success("Transaction added");
      setSheetOpen(false);
      resetForm();
      // Pull latest from Supabase so Home/Activity stay in sync
      try {
        if (isSupabaseConfigured()) {
          const cloud = await fetchCloudTransactions();
          if (cloud.length > 0) {
            mergeCloudData({ transactions: cloud });
          }
        }
      } catch {
        // local row already visible
      }
    } catch (e) {
      // Optimistic row is still in the feed; warn about cloud
      toast.error(e instanceof Error ? e.message : "Could not sync transaction");
      setSheetOpen(false);
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  const onLogoFile = async (file: File | null) => {
    if (!file) return;
    if (!isSupabaseConfigured()) {
      // Local preview via object URL
      setVendorLogoUrl(URL.createObjectURL(file));
      toast.message("Logo preview only", {
        description: "Configure Supabase to upload vendor logos.",
      });
      return;
    }
    try {
      const url = await uploadVendorLogo(file);
      if (url) {
        setVendorLogoUrl(url);
        toast.success("Logo uploaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title="Activity"
        showBack
        backHref="/home"
        rightSlot={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="Add custom transaction"
            >
              <Plus className="h-5 w-5" />
            </button>
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
          </div>
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

        <Button
          variant="secondary"
          className="mb-4 w-full"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add custom transaction
        </Button>

        {groups.length === 0 ? (
          <EmptyState
            icon={List}
            title="No activity found"
            description="Try another filter or add a custom transaction."
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

      <BottomSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetForm();
        }}
        title="Custom transaction"
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          <div className="flex gap-2">
            {(
              [
                ["debit", "Spend"],
                ["credit", "Income"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDirection(id)}
                className={cn(
                  "flex-1 rounded-full px-3 py-2 text-sm font-semibold",
                  direction === id
                    ? "bg-wise-green text-black"
                    : "bg-wise-surface-2 text-wise-mute"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="vendor">Vendor name</Label>
            <Input
              id="vendor"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Apple, Uber, Netflix…"
            />
          </div>

          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="mt-1.5 w-full rounded-2xl border border-wise-border bg-wise-surface-2 px-3 py-3 text-sm text-white"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="logoUrl">Vendor logo URL</Label>
            <Input
              id="logoUrl"
              value={vendorLogoUrl}
              onChange={(e) => setVendorLogoUrl(e.target.value)}
              placeholder="https://… or upload below"
            />
          </div>

          <div>
            <Label htmlFor="logoFile">Upload logo</Label>
            <Input
              id="logoFile"
              type="file"
              accept="image/*"
              className="mt-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-wise-green file:px-3 file:py-1 file:text-sm file:font-semibold file:text-black"
              onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {vendorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendorLogoUrl}
              alt="Vendor logo preview"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : null}

          <div>
            <Label htmlFor="subtitle">Note (optional)</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Coffee, subscription…"
            />
          </div>

          <div>
            <Label htmlFor="cardLink">Link to card (optional)</Label>
            <select
              id="cardLink"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-wise-border bg-wise-surface-2 px-3 py-3 text-sm text-white"
            >
              <option value="">None</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname?.trim() || c.cardholderName} ···{c.last4}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm text-wise-body">
            <input
              type="checkbox"
              checked={affectBalance}
              onChange={(e) => setAffectBalance(e.target.checked)}
              className="h-4 w-4 rounded border-wise-border"
            />
            Update local balance
          </label>

          <Button className="w-full" disabled={busy} onClick={onAddCustom}>
            {busy ? "Saving…" : "Save transaction"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
