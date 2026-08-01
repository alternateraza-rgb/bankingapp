"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addBusinessDays, format } from "date-fns";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { FeeBreakdown } from "@/components/send/fee-breakdown";
import { MoneyInput } from "@/components/shared/money-input";
import { CurrencySelector } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { useAppStore, getTransferPreview } from "@/store/app-store";
import { toast } from "sonner";
import { simulateStep } from "@/services/api";

const STEPS = ["Recipient", "Amount", "Payment", "Review", "Done"];

export default function SendAmountPage() {
  const router = useRouter();
  const draft = useAppStore((s) => s.transferDraft);
  const balances = useAppStore((s) => s.balances);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [loading, setLoading] = useState(false);
  const [amountStr, setAmountStr] = useState(
    draft.sourceAmount > 0 ? String(draft.sourceAmount) : ""
  );

  const amount = Number(amountStr) || 0;
  const preview = useMemo(
    () =>
      getTransferPreview({
        ...draft,
        sourceAmount: amount,
      }),
    [draft, amount]
  );

  const balance = balances.find((b) => b.currency === draft.sourceCurrency);

  const continueNext = async () => {
    if (amount <= 0) {
      toast.error("Enter an amount to send");
      return;
    }
    if (balance && amount > balance.amount) {
      toast.error("Insufficient balance");
      return;
    }
    setLoading(true);
    setTransferDraft({ sourceAmount: amount });
    await simulateStep();
    setLoading(false);
    router.push("/send/payment");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Amount" showBack backHref="/send" />
      <StepProgress steps={STEPS} current={1} className="mb-4" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-wise-mute">You send</p>
          <CurrencySelector
            value={draft.sourceCurrency}
            onChange={(sourceCurrency) => setTransferDraft({ sourceCurrency })}
            label="You send currency"
          />
        </div>
        <MoneyInput
          label="Amount"
          value={amountStr}
          onChange={setAmountStr}
          currency={draft.sourceCurrency}
        />
        <p className="text-xs text-wise-mute">
          Available:{" "}
          {balance
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: balance.currency,
              }).format(balance.amount)
            : "—"}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-wise-mute">Recipient gets</p>
          <CurrencySelector
            value={draft.targetCurrency}
            onChange={(targetCurrency) => setTransferDraft({ targetCurrency })}
            label="Recipient currency"
          />
        </div>
        <MoneyInput
          label="They receive"
          value={amount > 0 ? String(preview.targetAmount) : ""}
          onChange={() => undefined}
          currency={draft.targetCurrency}
          readOnly
        />

        <FeeBreakdown
          sourceAmount={amount}
          sourceCurrency={draft.sourceCurrency}
          targetAmount={preview.targetAmount}
          targetCurrency={draft.targetCurrency}
          fee={preview.fee}
          rate={preview.rate}
          arrivalLabel={format(addBusinessDays(new Date(), 1), "EEE, MMM d")}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={continueNext} disabled={loading}>
          {loading ? "Checking…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
