"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { RecipientCard } from "@/components/send/recipient-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { PageTransition } from "@/lib/motion";

export default function RecipientsPage() {
  const router = useRouter();
  const recipients = useAppStore((s) => s.recipients);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [query, setQuery] = useState("");

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

  return (
    <PageTransition>
      <MobileHeader title="Recipients" />
      <main className="flex flex-1 flex-col px-4 pb-8">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipients"
            className="border-transparent bg-wise-surface pl-10 text-white placeholder:text-wise-mute"
          />
        </div>
        <Button
          variant="secondary"
          className="mb-4 w-full justify-start gap-3"
          onClick={() => router.push("/send")}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wise-green text-wise-forest">
            <Plus className="h-5 w-5" />
          </span>
          Add a recipient
        </Button>
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-[20px] bg-wise-surface">
              <RecipientCard
                recipient={r}
                onSelect={() => {
                  setTransferDraft({
                    recipientId: r.id,
                    targetCurrency: r.currency,
                  });
                  router.push("/send/amount");
                }}
              />
            </div>
          ))}
        </div>
      </main>
    </PageTransition>
  );
}
