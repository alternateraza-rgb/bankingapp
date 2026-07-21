import type { CurrencyCode } from "@/types";

const ZERO_DECIMAL: CurrencyCode[] = [];

export function currencyDecimals(currency: CurrencyCode): number {
  return ZERO_DECIMAL.includes(currency) ? 0 : 2;
}

export function formatMoney(
  amount: number,
  currency: string,
  options?: { compact?: boolean; hideCurrency?: boolean }
): string {
  const decimals = currencyDecimals(
    (currency as CurrencyCode) in { USD: 1, EUR: 1, GBP: 1, PKR: 1, CNY: 1, PHP: 1, AED: 1, AUD: 1, CAD: 1 }
      ? (currency as CurrencyCode)
      : "USD"
  );
  if (options?.compact && Math.abs(amount) >= 10000) {
    return new Intl.NumberFormat("en-US", {
      style: options.hideCurrency ? "decimal" : "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: options?.hideCurrency ? "decimal" : "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatMoneyParts(amount: number, currency: CurrencyCode) {
  const decimals = currencyDecimals(currency);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).formatToParts(amount);

  const currencySymbol =
    formatted.find((p) => p.type === "currency")?.value ?? currency;
  const integer = formatted
    .filter((p) => p.type === "integer" || p.type === "group")
    .map((p) => p.value)
    .join("");
  const fraction = formatted.find((p) => p.type === "fraction")?.value;

  return { currencySymbol, integer, fraction, currency };
}

export function formatRate(rate: number, from: CurrencyCode, to: CurrencyCode) {
  const decimals = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  return `1 ${from} = ${rate.toFixed(decimals)} ${to}`;
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function maskCardNumber(fullNumber: string, revealed: boolean) {
  if (revealed) {
    return fullNumber.replace(/(.{4})/g, "$1 ").trim();
  }
  return `•••• •••• •••• ${fullNumber.slice(-4)}`;
}
