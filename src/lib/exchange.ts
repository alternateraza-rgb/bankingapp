import type { CurrencyCode, ExchangeRate } from "@/types";

/** Mid-market rates vs USD */
export const USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.9215,
  GBP: 0.7842,
  PKR: 278.45,
  CNY: 7.243,
  PHP: 61.6886,
  AED: 3.6725,
  AUD: 1.528,
  CAD: 1.364,
};

export const CURRENCY_META: Record<
  CurrencyCode,
  { name: string; flag: string; symbol: string }
> = {
  USD: { name: "US dollar", flag: "🇺🇸", symbol: "$" },
  EUR: { name: "Euro", flag: "🇪🇺", symbol: "€" },
  GBP: { name: "British pound", flag: "🇬🇧", symbol: "£" },
  PKR: { name: "Pakistani rupee", flag: "🇵🇰", symbol: "Rs" },
  CNY: { name: "Chinese yuan", flag: "🇨🇳", symbol: "¥" },
  PHP: { name: "Philippine peso", flag: "🇵🇭", symbol: "₱" },
  AED: { name: "UAE dirham", flag: "🇦🇪", symbol: "د.إ" },
  AUD: { name: "Australian dollar", flag: "🇦🇺", symbol: "A$" },
  CAD: { name: "Canadian dollar", flag: "🇨🇦", symbol: "C$" },
};

export function getRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;
  return USD_RATES[to] / USD_RATES[from];
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  const rate = getRate(from, to);
  const result = amount * rate;
  if (to === "PKR" || to === "PHP") return Math.round(result * 100) / 100;
  return Math.round(result * 100) / 100;
}

/** Fixed fee aligned with Wise-style transparency */
export function calculateFee(amount: number, currency: CurrencyCode): number {
  const fee = Math.max(amount * 0.00826, currency === "PKR" ? 50 : 0.5);
  if (currency === "PKR") return Math.round(fee);
  return Math.round(fee * 100) / 100;
}

export function buildExchangeRates(): ExchangeRate[] {
  const codes = Object.keys(USD_RATES) as CurrencyCode[];
  const updatedAt = "2026-07-20T08:00:00.000Z";
  const rates: ExchangeRate[] = [];
  for (const base of codes) {
    for (const quote of codes) {
      if (base === quote) continue;
      rates.push({
        base,
        quote,
        rate: getRate(base, quote),
        updatedAt,
      });
    }
  }
  return rates;
}

export function getRateHistory(
  from: CurrencyCode,
  to: CurrencyCode,
  range: "1D" | "1W" | "1M" | "3M" | "1Y"
): { date: string; rate: number }[] {
  const base = getRate(from, to);
  const points =
    range === "1D"
      ? 24
      : range === "1W"
        ? 7
        : range === "1M"
          ? 30
          : range === "3M"
            ? 90
            : 52;

  const seed =
    from.charCodeAt(0) * 17 + to.charCodeAt(0) * 31 + range.length;

  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin((i + seed) / 4.2) * 0.008;
    const drift = ((i - points / 2) / points) * 0.012;
    const noise = (((seed * (i + 3)) % 100) / 10000) - 0.005;
    const rate = base * (1 + wave + drift + noise);
    const date = new Date("2026-07-20T12:00:00.000Z");
    if (range === "1D") date.setHours(date.getHours() - (points - 1 - i));
    else if (range === "1Y") date.setDate(date.getDate() - (points - 1 - i) * 7);
    else date.setDate(date.getDate() - (points - 1 - i));
    return {
      date: date.toISOString(),
      rate: Math.round(rate * 1_000_000) / 1_000_000,
    };
  });
}

export const FEE_PERCENT = 0.826;
