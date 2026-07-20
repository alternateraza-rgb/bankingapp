import { randomDelay } from "@/lib/utils";
import { buildExchangeRates, getRateHistory } from "@/lib/exchange";
import type { CurrencyCode } from "@/types";

export async function fetchExchangeRates() {
  await randomDelay();
  return buildExchangeRates();
}

export async function fetchRateHistory(
  from: CurrencyCode,
  to: CurrencyCode,
  range: "1D" | "1W" | "1M" | "3M" | "1Y"
) {
  await randomDelay(200, 500);
  return getRateHistory(from, to, range);
}

export async function simulateStep() {
  await randomDelay();
}

export async function simulateAction<T>(result: T): Promise<T> {
  await randomDelay();
  return result;
}
