"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addBusinessDays } from "date-fns";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAppStore, getTransferPreview } from "@/store/app-store";
import { formatMoney, formatRate } from "@/lib/format";
import { simulateStep } from "@/services/api";
import { toast } from "sonner";
import Link from "next/link";

const STEPS = ["Recipient", "Amount", "Payment", "Review", "Done"];

export default function SendReviewPage() {
  const router = useRouter();
  const draft = useAppStore((s) => s.transferDraft);
  const recipients = useAppStore((s) => s.recipients);
  const executeTransfer = useAppStore((s) => s.executeTransfer);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const recipient = recipients.find((r) => r.id === draft.recipientId);
  const preview = getTransferPreview(draft);

  const confirm = async () => {
    if (!confirmed) {
      toast.error("Please confirm the transfer");
      return;
    }
    if (!recipient || draft.sourceAmount <= 0) {
      toast.error("Transfer details are incomplete");
      router.push("/send");
      return;
    }
    setLoading(true);
    try {
      await simulateStep();
      const result = executeTransfer();
      sessionStorage.setItem(
        "lastTransfer",
        JSON.stringify({
          reference: result.reference,
          arrival: result.arrival,
          transactionId: result.transaction.id,
          amount: draft.sourceAmount,
          currency: draft.sourceCurrency,
          targetAmount: preview.targetAmount,
          targetCurrency: draft.targetCurrency,
          recipientName: recipient.name,
        })
      );
      toast.success("Transfer sent");
      router.push("/send/success");
    } catch {
      toast.error("Could not complete transfer");
    } finally {
      setLoading(false);
    }
  };

  if (!recipient) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-body">No recipient selected</p>
        <Button asChild>
          <Link href="/send">Choose recipient</Link>
        </Button>
      </div>
    );
  }

  const rows = [
    {
      label: "Recipient",
      value: recipient.name,
      href: "/send",
    },
    {
      label: "You send",
      value: formatMoney(draft.sourceAmount, draft.sourceCurrency),
      href: "/send/amount",
    },
    {
      label: "Recipient gets",
      value: formatMoney(preview.targetAmount, draft.targetCurrency),
      href: "/send/amount",
    },
    {
      label: "Exchange rate",
      value: formatRate(
        preview.rate,
        draft.sourceCurrency,
        draft.targetCurrency
      ),
    },
    {
      label: "Service fee",
      value: formatMoney(preview.fee, draft.sourceCurrency),
    },
    {
      label: "Payment method",
      value: draft.paymentMethod,
      href: "/send/payment",
    },
    {
      label: "Total debit",
      value: formatMoney(draft.sourceAmount, draft.sourceCurrency),
      bold: true,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Review" showBack backHref="/send/payment" />
      <StepProgress steps={STEPS} current={3} className="mb-4" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-36">
        <div className="rounded-[24px] bg-wise-yellow/50 px-4 py-3 text-sm text-[#4a3b1c]">
          Review the details carefully before confirming.
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
                {row.href ? (
                  <Link
                    href={row.href}
                    className="text-xs font-semibold text-wise-forest underline"
                  >
                    Edit
                  </Link>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-wise-mute">
          Estimated arrival{" "}
          {format(addBusinessDays(new Date(), 1), "EEEE, MMM d")}
        </p>
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
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={confirm} disabled={loading}>
          {loading ? "Confirming…" : "Confirm transfer"}
        </Button>
      </div>
    </div>
  );
}
