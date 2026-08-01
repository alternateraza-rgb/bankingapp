"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MoneyInput, CurrencySelector } from "@/components/shared/money-input";
import { ExchangeRateChart } from "@/components/convert/exchange-rate-chart";
import { FeeBreakdown } from "@/components/send/fee-breakdown";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { calculateFee, convertAmount, getRate } from "@/lib/exchange";
import { formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/types";
import { toast } from "sonner";
import { simulateStep } from "@/services/api";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function ConvertPage() {
  const balances = useAppStore((s) => s.balances);
  const executeConversion = useAppStore((s) => s.executeConversion);
  const rateAlerts = useAppStore((s) => s.settings.rateAlerts);
  const toggleRateAlert = useAppStore((s) => s.toggleRateAlert);

  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("EUR");
  const [amountStr, setAmountStr] = useState("100");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const amount = Number(amountStr) || 0;
  const fee = calculateFee(amount, from);
  const net = Math.max(amount - fee, 0);
  const target = convertAmount(net, from, to);
  const rate = getRate(from, to);
  const pairKey = `${from}_${to}`;
  const balance = balances.find((b) => b.currency === from);

  const live = useMemo(
    () => ({
      label: "Live rate",
      value: formatRate(rate, from, to),
    }),
    [rate, from, to]
  );

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const runConvert = async () => {
    if (amount <= 0) {
      toast.error("Enter an amount to convert");
      return;
    }
    if (from === to) {
      toast.error("Choose two different currencies");
      return;
    }
    if (balance && amount > balance.amount) {
      toast.error("Insufficient balance");
      return;
    }
    setLoading(true);
    await simulateStep();
    executeConversion(from, to, amount);
    setLoading(false);
    setConfirmOpen(false);
    setSuccess(true);
    toast.success("Conversion complete");
  };

  if (success) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title="Converted" showBack backHref="/home" />
        <main className="flex flex-1 flex-col items-center px-4 pt-16 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-wise-green"
          >
            <Check className="h-10 w-10 text-wise-forest" strokeWidth={3} />
          </motion.div>
          <h2 className="mt-6 text-2xl font-bold">Conversion complete</h2>
          <p className="mt-2 text-sm text-wise-body">
            Your balances have been updated.
          </p>
          <Button className="mt-8" onClick={() => setSuccess(false)}>
            Convert again
          </Button>
          <Button variant="secondary" className="mt-3" asChild>
            <a href="/home">Back to home</a>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Convert" showBack backHref="/home" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-wise-mute">From</p>
            <CurrencySelector value={from} onChange={setFrom} label="From currency" />
          </div>
          <MoneyInput
            label="You convert"
            value={amountStr}
            onChange={setAmountStr}
            currency={from}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              className="z-10 -my-1 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-wise-surface text-wise-forest shadow-sm"
              aria-label="Swap currencies"
            >
              <ArrowDownUp className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-wise-mute">To</p>
            <CurrencySelector value={to} onChange={setTo} label="To currency" />
          </div>
          <MoneyInput
            label="You get"
            value={amount > 0 ? String(target) : ""}
            onChange={() => undefined}
            currency={to}
            readOnly
          />
        </div>

        <div className="flex items-center justify-between rounded-[20px] bg-wise-surface px-4 py-3">
          <div>
            <p className="text-xs text-wise-mute">{live.label}</p>
            <p className="font-semibold text-white">{live.value}</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-wise-positive">
            <span className="h-2 w-2 rounded-full bg-wise-positive" aria-hidden />
            Live
          </span>
        </div>

        <ExchangeRateChart from={from} to={to} />

        <div className="flex items-center justify-between rounded-[20px] bg-wise-surface px-4 py-3">
          <Label htmlFor="alert">Rate alert for {from}/{to}</Label>
          <Switch
            id="alert"
            checked={!!rateAlerts[pairKey]}
            onCheckedChange={() => {
              toggleRateAlert(pairKey);
              toast.success(
                rateAlerts[pairKey]
                  ? "Rate alert off"
                  : "Rate alert on"
              );
            }}
          />
        </div>

        <FeeBreakdown
          sourceAmount={amount}
          sourceCurrency={from}
          targetAmount={target}
          targetCurrency={to}
          fee={fee}
          rate={rate}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button className="w-full" onClick={() => setConfirmOpen(true)}>
          Convert
        </Button>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm conversion"
        description={`Convert ${from} to ${to}? `}
        confirmLabel="Confirm conversion"
        onConfirm={runConvert}
        loading={loading}
      />
    </div>
  );
}
