"use client";

import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/types";

interface FeeBreakdownProps {
  sourceAmount: number;
  sourceCurrency: CurrencyCode;
  targetAmount: number;
  targetCurrency: CurrencyCode;
  fee: number;
  rate: number;
  arrivalLabel?: string;
}

export function FeeBreakdown({
  sourceAmount,
  sourceCurrency,
  targetAmount,
  targetCurrency,
  fee,
  rate,
  arrivalLabel,
}: FeeBreakdownProps) {
  return (
    <div className="rounded-[20px] border border-border bg-wise-surface p-4 text-sm">
      <div className="flex justify-between py-2">
        <span className="text-wise-mute">You send</span>
        <span className="font-semibold text-white">
          {formatMoney(sourceAmount, sourceCurrency)}
        </span>
      </div>
      <div className="flex justify-between py-2">
        <span className="text-wise-mute">Our fee</span>
        <span className="font-semibold text-white">
          {formatMoney(fee, sourceCurrency)}
        </span>
      </div>
      <div className="flex justify-between py-2">
        <span className="text-wise-mute">Exchange rate</span>
        <span className="font-semibold text-white">
          {formatRate(rate, sourceCurrency, targetCurrency)}
        </span>
      </div>
      <div className="my-1 border-t border-border" />
      <div className="flex justify-between py-2">
        <span className="font-semibold text-white">Recipient gets</span>
        <span className="font-bold text-white">
          {formatMoney(targetAmount, targetCurrency)}
        </span>
      </div>
      {arrivalLabel ? (
        <p className="mt-1 text-xs text-wise-mute">
          Estimated arrival: {arrivalLabel}
        </p>
      ) : null}
    </div>
  );
}
