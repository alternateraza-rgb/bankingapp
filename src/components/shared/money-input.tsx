"use client";

import { CURRENCY_META } from "@/lib/exchange";
import type { CurrencyCode } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  options?: CurrencyCode[];
  className?: string;
  label?: string;
}

export function CurrencySelector({
  value,
  onChange,
  options = ["USD", "EUR", "GBP", "PKR", "CNY", "PHP", "AED", "AUD", "CAD"],
  className,
  label,
}: CurrencySelectorProps) {
  const meta = CURRENCY_META[value];
  return (
    <label className={cn("relative inline-flex", className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5 text-sm font-semibold">
        <span aria-hidden>{meta.flag}</span>
        {value}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="h-11 appearance-none rounded-full border border-transparent bg-wise-surface-2 py-2 pl-14 pr-10 text-base font-semibold text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={label ?? "Select currency"}
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_META[code].flag} {code} — {CURRENCY_META[code].name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute"
        aria-hidden
      />
    </label>
  );
}

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyCode;
  label: string;
  readOnly?: boolean;
  className?: string;
}

export function MoneyInput({
  value,
  onChange,
  currency,
  label,
  readOnly,
  className,
}: MoneyInputProps) {
  return (
    <div className={cn("rounded-[24px] bg-wise-surface p-4", className)}>
      <p className="text-sm text-wise-mute">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <input
          inputMode="decimal"
          value={value}
          readOnly={readOnly}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9.]/g, "");
            const parts = next.split(".");
            const cleaned =
              parts.length > 2
                ? `${parts[0]}.${parts.slice(1).join("")}`
                : next;
            onChange(cleaned);
          }}
          className="balance-amount min-w-0 flex-1 bg-transparent text-[36px] font-bold tracking-tight text-white outline-none placeholder:text-wise-mute/50 read-only:cursor-default"
          placeholder="0"
          aria-label={label}
        />
        <span className="rounded-full bg-wise-surface-2 px-3 py-1.5 text-sm font-bold text-white">
          {CURRENCY_META[currency].flag} {currency}
        </span>
      </div>
    </div>
  );
}
