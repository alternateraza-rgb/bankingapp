import type { CurrencyCode } from "@/types";

export const CURRENCY_META: Record<
  string,
  { name: string; flag: string; symbol: string }
> = {
  USD: { name: "US Dollar", flag: "🇺🇸", symbol: "$" },
  EUR: { name: "Euro", flag: "🇪🇺", symbol: "€" },
  GBP: { name: "British Pound", flag: "🇬🇧", symbol: "£" },
  PKR: { name: "Pakistani Rupee", flag: "🇵🇰", symbol: "₨" },
  CNY: { name: "Chinese Yuan", flag: "🇨🇳", symbol: "¥" },
  AED: { name: "UAE Dirham", flag: "🇦🇪", symbol: "د.إ" },
  AUD: { name: "Australian Dollar", flag: "🇦🇺", symbol: "A$" },
  CAD: { name: "Canadian Dollar", flag: "🇨🇦", symbol: "C$" },
  PHP: { name: "Philippine Peso", flag: "🇵🇭", symbol: "₱" },
};

export const CRYPTO_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { id: "solana", symbol: "SOL", name: "Solana", color: "#14F195" },
] as const;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCY_META;
}
