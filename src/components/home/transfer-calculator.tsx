"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Info } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { calculateFee, convertAmount, getRate, getRateHistory } from "@/lib/exchange";
import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { CURRENCY_META } from "@/lib/exchange";

const OPTIONS: CurrencyCode[] = ["USD", "EUR", "GBP", "PHP", "PKR", "AED", "AUD", "CAD", "CNY"];

export function TransferCalculator() {
  const router = useRouter();
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("PHP");
  const [amountStr, setAmountStr] = useState("1000");

  const amount = Number(amountStr.replace(/,/g, "")) || 0;
  const fee = calculateFee(amount, from);
  const net = Math.max(amount - fee, 0);
  const target = convertAmount(net, from, to);
  const rate = getRate(from, to);

  const chartData = useMemo(
    () => getRateHistory(from, to, "1M"),
    [from, to]
  );

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const send = () => {
    setTransferDraft({
      sourceCurrency: from,
      targetCurrency: to,
      sourceAmount: amount,
    });
    router.push("/send");
  };

  return (
    <section className="space-y-3">
      <h2 className="text-[22px] font-bold tracking-tight text-white">
        Transfer calculator
      </h2>
      <div className="rounded-[28px] bg-wise-surface p-4">
        <div className="h-28 w-full" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="calcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9FE870" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#9FE870" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis
                orientation="right"
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "#8e8e93" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickCount={3}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#9FE870"
                strokeWidth={2.5}
                fill="url(#calcFill)"
                dot={false}
                activeDot={{ r: 4, fill: "#9FE870", stroke: "#000" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-wise-mute">
          <span>Jun 20</span>
          <span>Today</span>
        </div>
        <p className="mt-3 text-[15px] font-semibold text-white">
          {formatRate(rate, from, to)}
        </p>

        <div className="relative mt-4 space-y-2">
          <CalcRow
            value={amountStr}
            onChange={setAmountStr}
            currency={from}
            onCurrencyChange={setFrom}
            editable
          />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={swap}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-wise-surface-2 text-white"
              aria-label="Swap currencies"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>
          <CalcRow
            value={
              amount > 0
                ? target.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0"
            }
            onChange={() => undefined}
            currency={to}
            onCurrencyChange={setTo}
            editable={false}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
          <div>
            <p className="flex items-center gap-1 text-xs text-wise-mute">
              Includes fees
              <Info className="h-3 w-3" aria-hidden />
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">
              {formatMoney(fee, from)}
            </p>
          </div>
          <div className="border-l border-white/10 pl-3">
            <p className="text-xs text-wise-mute">Should arrive</p>
            <p className="mt-1 text-[15px] font-semibold text-white">
              In 6 hours
            </p>
          </div>
        </div>

        <Button className="mt-5 w-full" size="lg" onClick={send}>
          Send
        </Button>
      </div>
    </section>
  );
}

function CalcRow({
  value,
  onChange,
  currency,
  onCurrencyChange,
  editable,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  editable: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] bg-black px-4 py-3.5">
      <input
        value={value}
        readOnly={!editable}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9.,]/g, "");
          onChange(next);
        }}
        className={cn(
          "balance-amount min-w-0 flex-1 bg-transparent text-[28px] font-semibold tracking-tight text-white outline-none",
          !editable && "cursor-default"
        )}
        inputMode="decimal"
        aria-label={editable ? "You send" : "Recipient gets"}
      />
      <label className="relative shrink-0">
        <span className="flex h-10 items-center gap-1.5 rounded-full bg-wise-surface-2 pl-2.5 pr-2 text-sm font-semibold text-white">
          <span aria-hidden>{CURRENCY_META[currency].flag}</span>
          {currency}
          <span className="text-wise-mute">▾</span>
        </span>
        <select
          className="absolute inset-0 cursor-pointer opacity-0"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          aria-label="Currency"
        >
          {OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_META[c].flag} {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
