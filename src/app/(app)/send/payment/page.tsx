"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";

/** Payment step is optional for P2P — always pay from Niro balance. */
export default function SendPaymentPage() {
  const router = useRouter();
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);

  useEffect(() => {
    setTransferDraft({ paymentMethod: "balance" });
  }, [setTransferDraft]);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Payment" showBack backHref="/send/amount" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <p className="text-sm text-wise-mute">
          Niro P2P transfers are paid from your wallet balance.
        </p>
        <div className="flex items-center gap-3 rounded-[20px] border border-wise-green bg-wise-surface px-4 py-4 ring-2 ring-wise-green/40">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-wise-surface-2 text-wise-green">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold text-white">Niro balance</span>
            <span className="block text-sm text-wise-mute">
              Instant · no extra fees for demo
            </span>
          </span>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 w-full max-w-full border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={() => router.push("/send/review")}>
          Continue to review
        </Button>
      </div>
    </div>
  );
}
