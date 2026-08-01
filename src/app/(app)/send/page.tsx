"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { RecipientCard } from "@/components/send/recipient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import type { CurrencyCode, RecipientType } from "@/types";
import { toast } from "sonner";

const STEPS = ["Recipient", "Amount", "Payment", "Review", "Done"];

export default function SendPage() {
  const router = useRouter();
  const recipients = useAppStore((s) => s.recipients);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const addRecipient = useAppStore((s) => s.addRecipient);
  const selectedId = useAppStore((s) => s.transferDraft.recipientId);

  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "personal" as RecipientType,
    country: "",
    currency: "USD" as CurrencyCode,
    accountLast4: "",
    bankName: "",
    email: "",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.bankName.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q)
    );
  }, [recipients, query]);

  const continueNext = () => {
    if (!selectedId) {
      toast.error("Select a recipient to continue");
      return;
    }
    const recipient = recipients.find((r) => r.id === selectedId);
    if (recipient) {
      setTransferDraft({
        recipientId: selectedId,
        targetCurrency: recipient.currency,
      });
    }
    router.push("/send/amount");
  };

  const createRecipient = () => {
    if (!form.name || !form.country || !form.bankName || !/^\d{4}$/.test(form.accountLast4)) {
      toast.error("Fill in all required recipient fields");
      return;
    }
    const created = addRecipient({
      name: form.name,
      type: form.type,
      email: form.email || undefined,
      country: form.country,
      currency: form.currency,
      accountLast4: form.accountLast4,
      bankName: form.bankName,
      avatarColor: "#9FE870",
      initials: form.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    setTransferDraft({
      recipientId: created.id,
      targetCurrency: created.currency,
    });
    setSheetOpen(false);
    toast.success("Recipient added");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Send" showBack backHref="/home" />
      <StepProgress steps={STEPS} current={0} className="mb-4" />
      <main className="flex flex-1 flex-col px-4 pb-28">
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipients"
            className="pl-10"
            aria-label="Search recipients"
          />
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-[20px] border border-dashed border-white/20 bg-wise-surface px-4 py-4 text-left font-semibold text-white hover:bg-wise-surface-2/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-wise-green text-wise-forest">
            <Plus className="h-5 w-5" aria-hidden />
          </span>
          Add a new recipient
        </button>

        <div className="space-y-2" role="listbox" aria-label="Recipients">
          {filtered.map((r) => (
            <RecipientCard
              key={r.id}
              recipient={r}
              selected={selectedId === r.id}
              onSelect={() => setTransferDraft({ recipientId: r.id, targetCurrency: r.currency })}
            />
          ))}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-wise-mute">
              No recipients match your search
            </p>
          ) : null}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:max-w-none lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={continueNext}>
          Continue
        </Button>
      </div>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Add recipient"
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              className="mt-1.5"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            {(["personal", "business"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, type })}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold capitalize ${
                  form.type === type
                    ? "bg-wise-green text-wise-forest"
                    : "bg-wise-surface-2 text-wise-body"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              className="mt-1.5"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bank">Bank name</Label>
            <Input
              id="bank"
              className="mt-1.5"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="last4">Account last 4 digits</Label>
            <Input
              id="last4"
              className="mt-1.5"
              inputMode="numeric"
              maxLength={4}
              value={form.accountLast4}
              onChange={(e) =>
                setForm({
                  ...form,
                  accountLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              className="mt-1.5 flex h-12 w-full rounded-xl border border-input bg-wise-surface px-4 text-base"
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value as CurrencyCode })
              }
            >
              {(["USD", "EUR", "GBP", "PKR", "CNY"] as const).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Button className="mt-2 w-full" onClick={createRecipient}>
            Save recipient
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
