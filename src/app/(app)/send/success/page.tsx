"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/types";

const STEPS = ["Recipient", "Amount", "Payment", "Review", "Done"];

interface LastTransfer {
  reference: string;
  arrival: string;
  transactionId: string;
  amount: number;
  currency: CurrencyCode;
  targetAmount: number;
  targetCurrency: CurrencyCode;
  recipientName: string;
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
      <StepProgress steps={STEPS} current={4} className="mb-4" />
      <main className="flex flex-1 flex-col items-center px-4 pb-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-wise-green"
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Check className="h-10 w-10 text-wise-forest" strokeWidth={3} />
          </motion.div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="mt-6 text-2xl font-bold text-white"
        >
          Transfer sent
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          className="mt-2 max-w-sm text-sm text-wise-body"
        >
          Your transfer is on its way.
        </motion.p>

        {data ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-8 w-full rounded-[24px] bg-wise-surface p-5 text-left text-sm"
          >
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">To</span>
              <span className="font-semibold">{data.recipientName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Sent</span>
              <span className="font-semibold">
                {formatMoney(data.amount, data.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">They get</span>
              <span className="font-semibold">
                {formatMoney(data.targetAmount, data.targetCurrency)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Reference</span>
              <span className="font-semibold">{data.reference}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-wise-mute">Arrives by</span>
              <span className="font-semibold">
                {format(new Date(data.arrival), "EEE, MMM d")}
              </span>
            </div>
          </motion.div>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3">
          {data ? (
            <Button asChild>
              <Link href={`/activity/${data.transactionId}`}>
                View transfer
              </Link>
            </Button>
          ) : null}
          <Button variant="secondary" asChild>
            <Link href="/home">Return home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
