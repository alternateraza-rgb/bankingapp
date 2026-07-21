"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

const STEPS = ["Recipient", "Amount", "Review", "Done"];

interface LastTransfer {
  reference: string;
  transferId: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientHandle: string;
}

export default function SendSuccessPage() {
  const [data, setData] = useState<LastTransfer | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("lastTransfer");
    if (raw) setData(JSON.parse(raw) as LastTransfer);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Success" showBack backHref="/home" />
      <StepProgress steps={STEPS} current={3} className="mb-4" />
      <main className="flex flex-1 flex-col items-center px-4 pb-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-wise-green"
        >
          <Check className="h-10 w-10 text-wise-forest" strokeWidth={3} />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="mt-6 text-2xl font-bold text-white"
        >
          Money sent
        </motion.h2>
        <p className="mt-2 max-w-sm text-sm text-wise-mute">
          Your transfer landed instantly in their Niro wallet.
        </p>

        {data ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-8 w-full rounded-[24px] bg-wise-surface p-5 text-left text-sm"
          >
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">To</span>
              <span className="font-semibold text-white">
                {data.recipientName}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Handle</span>
              <span className="font-semibold text-white">
                @{data.recipientHandle}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Sent</span>
              <span className="font-semibold text-white">
                {formatMoney(data.amount, data.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Reference</span>
              <span className="font-semibold text-white">{data.reference}</span>
            </div>
          </motion.div>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3">
          <Button asChild>
            <Link href="/activity">View activity</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/home">Return home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
