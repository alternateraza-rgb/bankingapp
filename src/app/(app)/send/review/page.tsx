"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { useNiroData } from "@/hooks/use-niro-data";
import { transferP2P } from "@/services/niro";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

const STEPS = ["Recipient", "Amount", "Review", "Done"];

export default function SendReviewPage() {
  const router = useRouter();
  const draft = useAppStore((s) => s.transferDraft);
  const sendTarget = useAppStore((s) => s.sendTarget);
  const resetTransferDraft = useAppStore((s) => s.resetTransferDraft);
  const { refresh } = useNiroData();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!confirmed) {
      toast.error("Please confirm the transfer");
      return;
    }
    if (!sendTarget || draft.sourceAmount <= 0) {
      toast.error("Transfer details are incomplete");
      router.push("/send");
      return;
    }
    setLoading(true);
    try {
      const result = (await transferP2P(
        sendTarget.handle,
        draft.sourceCurrency,
        draft.sourceAmount,
        draft.note || ""
      )) as { id?: string; reference?: string };

      sessionStorage.setItem(
        "lastTransfer",
        JSON.stringify({
          reference: result.reference ?? "—",
          transferId: result.id ?? "",
          amount: draft.sourceAmount,
          currency: draft.sourceCurrency,
          recipientName: sendTarget.fullName,
          recipientHandle: sendTarget.handle,
        })
      );
      resetTransferDraft();
      await refresh();
      toast.success("Transfer sent");
      router.push("/send/success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete transfer");
    } finally {
      setLoading(false);
    }
  };

  if (!sendTarget) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-mute">No recipient selected</p>
        <Button asChild>
          <Link href="/send">Choose recipient</Link>
        </Button>
      </div>
    );
  }

  const rows = [
    { label: "To", value: `${sendTarget.fullName} (@${sendTarget.handle})`, href: "/send" },
    {
      label: "You send",
      value: formatMoney(draft.sourceAmount, draft.sourceCurrency),
      href: "/send/amount",
    },
    { label: "Pay from", value: "Niro balance" },
    ...(draft.note
      ? [{ label: "Note", value: draft.note }]
      : []),
    {
      label: "Total debit",
      value: formatMoney(draft.sourceAmount, draft.sourceCurrency),
      bold: true,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Review" showBack backHref="/send/amount" />
      <StepProgress steps={STEPS} current={2} className="mb-4" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-36">
        <div className="rounded-[24px] border border-white/10 bg-wise-surface px-4 py-3 text-sm text-wise-mute">
          Instant P2P — arrives immediately in their Niro wallet.
        </div>
        <div className="rounded-[24px] bg-wise-surface p-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <span className="text-sm text-wise-mute">{row.label}</span>
              <span className="flex items-center gap-2 text-right">
                <span
                  className={`text-sm ${row.bold ? "font-bold" : "font-semibold"} text-white`}
                >
                  {row.value}
                </span>
                {"href" in row && row.href ? (
                  <Link
                    href={row.href}
                    className="text-xs font-semibold text-wise-green underline"
                  >
                    Edit
                  </Link>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-[20px] bg-wise-surface p-4">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
          />
          <Label htmlFor="confirm" className="leading-snug">
            I confirm the transfer details are correct.
          </Label>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 w-full max-w-full border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={confirm} disabled={loading}>
          {loading ? "Sending…" : "Confirm & send"}
        </Button>
      </div>
    </div>
  );
}
