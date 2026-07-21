"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNiroData } from "@/hooks/use-niro-data";
import { updateCardLimits } from "@/services/niro";
import { toast } from "sonner";

export default function CardSettingsPage() {
  const { cards, loading, refresh } = useNiroData();
  const card = cards[0];
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!card) return;
    setDaily(String(card.spend_limit_daily));
    setMonthly(String(card.spend_limit_monthly));
  }, [card]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title="Card settings" showBack backHref="/cards" />
        <p className="px-4 py-10 text-center text-sm text-wise-mute">Loading…</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-mute">No card yet</p>
        <Button asChild>
          <Link href="/cards">Create a card</Link>
        </Button>
      </div>
    );
  }

  const save = async () => {
    const d = Number(daily);
    const m = Number(monthly);
    if (!(d > 0) || !(m > 0)) {
      toast.error("Limits must be positive");
      return;
    }
    if (d > m) {
      toast.error("Daily limit cannot exceed monthly");
      return;
    }
    setBusy(true);
    try {
      await updateCardLimits(card.id, d, m);
      await refresh();
      toast.success("Limits updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Card settings" showBack backHref="/cards" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <p className="text-sm text-wise-mute">
          Card •••• {card.last4} · {card.status}
        </p>
        <div>
          <Label htmlFor="daily">Daily spend limit (USD)</Label>
          <Input
            id="daily"
            className="mt-1.5"
            inputMode="decimal"
            value={daily}
            onChange={(e) => setDaily(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="monthly">Monthly spend limit (USD)</Label>
          <Input
            id="monthly"
            className="mt-1.5"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div className="rounded-[20px] bg-wise-surface px-4 py-3 text-sm text-wise-mute">
          Online payments, contactless, and foreign transactions are enabled for
          this demo card.
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save limits"}
        </Button>
      </div>
    </div>
  );
}
