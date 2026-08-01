import type { Transaction } from "@/types";
import { generateReference } from "@/lib/utils";

/** Build a ~35-day realistic spend history ending at `now`. */
export function buildStarterTransactions(now = new Date()): Transaction[] {
  const vendors: Array<{
    title: string;
    subtitle: string;
    amount: number;
    type: Transaction["type"];
    daysAgo: number;
    hour: number;
  }> = [
    { title: "Starbucks", subtitle: "Card payment", amount: -6.45, type: "card", daysAgo: 0, hour: 9 },
    { title: "Uber", subtitle: "Card payment", amount: -14.2, type: "card", daysAgo: 0, hour: 18 },
    { title: "Apple", subtitle: "App Store", amount: -2.99, type: "card", daysAgo: 1, hour: 11 },
    { title: "Alipay", subtitle: "Transfer out", amount: -48.0, type: "transfer", daysAgo: 1, hour: 20 },
    { title: "Netflix", subtitle: "Subscription", amount: -15.49, type: "card", daysAgo: 2, hour: 7 },
    { title: "Amazon", subtitle: "Card payment", amount: -42.18, type: "card", daysAgo: 2, hour: 16 },
    { title: "Shell", subtitle: "Fuel", amount: -51.3, type: "card", daysAgo: 3, hour: 17 },
    { title: "Starbucks", subtitle: "Card payment", amount: -5.85, type: "card", daysAgo: 4, hour: 8 },
    { title: "Spotify", subtitle: "Subscription", amount: -10.99, type: "card", daysAgo: 5, hour: 6 },
    { title: "McDonald's", subtitle: "Card payment", amount: -11.4, type: "card", daysAgo: 5, hour: 13 },
    { title: "Apple", subtitle: "iCloud+", amount: -2.99, type: "card", daysAgo: 6, hour: 10 },
    { title: "Target", subtitle: "Card payment", amount: -67.52, type: "card", daysAgo: 7, hour: 15 },
    { title: "Uber Eats", subtitle: "Card payment", amount: -23.75, type: "card", daysAgo: 8, hour: 19 },
    { title: "Alipay", subtitle: "Shopping", amount: -29.9, type: "card", daysAgo: 9, hour: 12 },
    { title: "Starbucks", subtitle: "Card payment", amount: -7.15, type: "card", daysAgo: 10, hour: 9 },
    { title: "Whole Foods", subtitle: "Groceries", amount: -84.22, type: "card", daysAgo: 11, hour: 14 },
    { title: "Adobe", subtitle: "Subscription", amount: -54.99, type: "card", daysAgo: 12, hour: 8 },
    { title: "CVS Pharmacy", subtitle: "Card payment", amount: -18.64, type: "card", daysAgo: 13, hour: 11 },
    { title: "Apple", subtitle: "App Store", amount: -9.99, type: "card", daysAgo: 14, hour: 21 },
    { title: "Uber", subtitle: "Card payment", amount: -22.1, type: "card", daysAgo: 15, hour: 22 },
    { title: "Starbucks", subtitle: "Card payment", amount: -6.25, type: "card", daysAgo: 16, hour: 8 },
    { title: "Amazon", subtitle: "Prime", amount: -14.99, type: "card", daysAgo: 17, hour: 7 },
    { title: "Chipotle", subtitle: "Card payment", amount: -13.85, type: "card", daysAgo: 18, hour: 12 },
    { title: "Alipay", subtitle: "Transfer out", amount: -75.0, type: "transfer", daysAgo: 19, hour: 16 },
    { title: "Nike", subtitle: "Card payment", amount: -120.0, type: "card", daysAgo: 20, hour: 13 },
    { title: "Starbucks", subtitle: "Card payment", amount: -5.45, type: "card", daysAgo: 21, hour: 9 },
    { title: "Google One", subtitle: "Subscription", amount: -9.99, type: "card", daysAgo: 22, hour: 6 },
    { title: "Walgreens", subtitle: "Card payment", amount: -27.33, type: "card", daysAgo: 23, hour: 18 },
    { title: "Uber", subtitle: "Card payment", amount: -16.8, type: "card", daysAgo: 24, hour: 20 },
    { title: "Apple", subtitle: "Music", amount: -10.99, type: "card", daysAgo: 25, hour: 7 },
    { title: "Starbucks", subtitle: "Card payment", amount: -8.1, type: "card", daysAgo: 26, hour: 10 },
    { title: "Best Buy", subtitle: "Card payment", amount: -149.99, type: "card", daysAgo: 27, hour: 15 },
    { title: "Alipay", subtitle: "Shopping", amount: -36.5, type: "card", daysAgo: 28, hour: 11 },
    { title: "DoorDash", subtitle: "Card payment", amount: -31.2, type: "card", daysAgo: 30, hour: 19 },
    { title: "Starbucks", subtitle: "Card payment", amount: -6.75, type: "card", daysAgo: 32, hour: 8 },
    { title: "Amazon", subtitle: "Card payment", amount: -58.4, type: "card", daysAgo: 34, hour: 14 },
    {
      title: "Account top-up",
      subtitle: "Opening balance",
      amount: 5500,
      type: "deposit",
      daysAgo: 35,
      hour: 9,
    },
  ];

  return vendors.map((v, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - v.daysAgo);
    date.setUTCHours(v.hour, (index * 7) % 60, 0, 0);

    return {
      id: `txn_seed_${String(index + 1).padStart(3, "0")}`,
      type: v.type,
      status: "completed" as const,
      title: v.title,
      subtitle: v.subtitle,
      amount: v.amount,
      currency: "USD" as const,
      fee: 0,
      feeCurrency: "USD" as const,
      reference: generateReference(),
      date: date.toISOString(),
      merchantOrRecipient: v.title,
      vendorName: v.title,
      isCustom: false,
    };
  });
}

/** Static seed used when a date-stable list is needed at module load. */
export const INITIAL_TRANSACTIONS: Transaction[] = buildStarterTransactions(
  new Date("2026-08-01T12:00:00.000Z")
);
