"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Snowflake, Copy, Check } from "lucide-react";
import { maskCardNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export type VirtualCardData = {
  id: string;
  cardholderName: string;
  last4: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  network?: string;
  frozen: boolean;
  spendLimitDaily?: number;
  spendLimitMonthly?: number;
  spentToday?: number;
  spentMonth?: number;
};

interface VirtualCardProps {
  card: VirtualCardData;
  onToggleFreeze: () => void;
  className?: string;
}

export function VirtualCard({
  card,
  onToggleFreeze,
  className,
}: VirtualCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  const copyNumber = async () => {
    await navigator.clipboard.writeText(card.fullNumber);
    setCopied(true);
    toast.success("Card number copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        whileHover={reduce ? undefined : { y: -4 }}
        className={cn(
          "relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg shadow-black/20",
          "bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]",
          card.frozen && "opacity-70"
        )}
      >
        <motion.div
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10"
          animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/70">
              Niro · Virtual debit
            </p>
            <p className="mt-1 text-sm font-semibold text-wise-green">
              Virtual card
            </p>
          </div>
          <span className="text-xl font-black italic tracking-tight text-white">
            {(card.network ?? "visa").toUpperCase()}
          </span>
        </div>
        <p className="balance-amount relative mt-10 text-xl font-semibold tracking-[0.18em]">
          {maskCardNumber(card.fullNumber, revealed)}
        </p>
        <div className="relative mt-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              Cardholder
            </p>
            <p className="text-sm font-semibold">{card.cardholderName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              Expires
            </p>
            <p className="text-sm font-semibold">
              {revealed ? card.expiry : "••/••"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              CVV
            </p>
            <p className="text-sm font-semibold">
              {revealed ? card.cvv : "•••"}
            </p>
          </div>
        </div>
        {card.frozen ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded-full bg-wise-surface px-4 py-2 text-sm font-bold text-white">
              Frozen
            </span>
          </div>
        ) : null}
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => (revealed ? setRevealed(false) : setConfirmReveal(true))}
          className="flex flex-col items-center gap-1 rounded-[20px] bg-wise-surface px-2 py-3 text-xs font-semibold text-white hover:bg-wise-surface-2"
        >
          {revealed ? (
            <EyeOff className="h-5 w-5" aria-hidden />
          ) : (
            <Eye className="h-5 w-5" aria-hidden />
          )}
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          onClick={onToggleFreeze}
          className="flex flex-col items-center gap-1 rounded-[20px] bg-wise-surface px-2 py-3 text-xs font-semibold text-white hover:bg-wise-surface-2"
        >
          <Snowflake className="h-5 w-5" aria-hidden />
          {card.frozen ? "Unfreeze" : "Freeze"}
        </button>
        <button
          type="button"
          onClick={copyNumber}
          className="flex flex-col items-center gap-1 rounded-[20px] bg-wise-surface px-2 py-3 text-xs font-semibold text-white hover:bg-wise-surface-2"
        >
          {copied ? (
            <Check className="h-5 w-5 text-wise-positive" aria-hidden />
          ) : (
            <Copy className="h-5 w-5" aria-hidden />
          )}
          Copy
        </button>
      </div>

      <ConfirmationDialog
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title="Reveal card details?"
        description="Card details are sensitive. Make sure nobody else can see your screen."
        confirmLabel="Reveal details"
        onConfirm={() => {
          setRevealed(true);
          setConfirmReveal(false);
        }}
      />
    </div>
  );
}
