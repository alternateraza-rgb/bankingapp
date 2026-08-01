"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, Wallet } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";
import { simulateStep } from "@/services/api";
import { toast } from "sonner";

const STEPS = ["Recipient", "Amount", "Payment", "Review", "Done"];

const methods: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Wallet;
}[] = [
  {
    id: "balance",
    label: "Wise balance",
    description: "Pay from your currency balances",
    icon: Wallet,
  },
  {
    id: "card",
    label: "Debit card",
    description: "Card ending 4242",
    icon: CreditCard,
  },
  {
    id: "bank",
    label: "Bank transfer",
    description: "Bank transfer",
    icon: Building2,
  },
];

export default function SendPaymentPage() {
  const router = useRouter();
  const draft = useAppStore((s) => s.transferDraft);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [loading, setLoading] = useState(false);

  const continueNext = async () => {
    if (!draft.paymentMethod) {
      toast.error("Choose a payment method");
      return;
    }
    setLoading(true);
    await simulateStep();
    setLoading(false);
    router.push("/send/review");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Payment" showBack backHref="/send/amount" />
      <StepProgress steps={STEPS} current={2} className="mb-4" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-28">
        <p className="text-sm text-wise-body">
          How would you like to pay?
        </p>
        {methods.map(({ id, label, description, icon: Icon }) => {
          const selected = draft.paymentMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTransferDraft({ paymentMethod: id })}
              className={cn(
                "flex items-center gap-3 rounded-[20px] border bg-wise-surface px-4 py-4 text-left transition-all",
                selected
                  ? "border-wise-forest ring-2 ring-wise-green"
                  : "border-transparent"
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-wise-forest">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-white">{label}</span>
                <span className="block text-sm text-wise-mute">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={continueNext} disabled={loading}>
          {loading ? "Loading…" : "Continue to review"}
        </Button>
      </div>
    </div>
  );
}
