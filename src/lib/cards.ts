import type { Card } from "@/types";
import { generateId } from "@/lib/utils";

export type CardNetwork = Card["network"];

export function generateCardNumber(network: CardNetwork = "visa"): string {
  const randDigits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

  switch (network) {
    case "mastercard":
      return `5${randDigits(15)}`;
    case "amex":
      return `3${randDigits(14)}`;
    case "discover":
      return `6${randDigits(15)}`;
    default:
      return `4${randDigits(15)}`;
  }
}

export function generateExpiry(): string {
  const month = String(((new Date().getMonth() + 3) % 12) + 1).padStart(2, "0");
  const year = String((new Date().getFullYear() + 4) % 100).padStart(2, "0");
  return `${month}/${year}`;
}

export function generateCvv(network: CardNetwork = "visa"): string {
  const len = network === "amex" ? 4 : 3;
  return String(Math.floor(Math.random() * 10 ** len)).padStart(len, "0");
}

export function buildRandomCard(input: {
  cardholderName: string;
  network?: CardNetwork;
  nickname?: string;
  color?: string;
  spendingLimit?: number;
}): Card {
  const network = input.network ?? "visa";
  const fullNumber = generateCardNumber(network);
  return {
    id: generateId("card"),
    cardholderName: input.cardholderName.trim() || "Wise User",
    last4: fullNumber.slice(-4),
    fullNumber,
    expiry: generateExpiry(),
    cvv: generateCvv(network),
    network,
    frozen: false,
    spendingLimit: input.spendingLimit ?? 2500,
    spendingUsed: 0,
    onlinePayments: true,
    contactless: true,
    foreignTransactions: true,
    nickname: input.nickname?.trim() ?? "",
    color: input.color?.trim() || "#163300",
    isCustom: false,
  };
}

export function buildCustomCard(input: {
  cardholderName: string;
  network?: CardNetwork;
  fullNumber?: string;
  expiry?: string;
  cvv?: string;
  nickname?: string;
  color?: string;
  spendingLimit?: number;
}): Card {
  const network = input.network ?? "visa";
  const digits = (input.fullNumber ?? "").replace(/\s+/g, "");
  const fullNumber =
    digits.length >= 15 ? digits : generateCardNumber(network);
  const expiry =
    input.expiry && /^(0[1-9]|1[0-2])\/\d{2}$/.test(input.expiry)
      ? input.expiry
      : generateExpiry();
  const cvv =
    input.cvv && /^\d{3,4}$/.test(input.cvv)
      ? input.cvv
      : generateCvv(network);

  return {
    id: generateId("card"),
    cardholderName: input.cardholderName.trim(),
    last4: fullNumber.slice(-4),
    fullNumber,
    expiry,
    cvv,
    network,
    frozen: false,
    spendingLimit: input.spendingLimit ?? 2500,
    spendingUsed: 0,
    onlinePayments: true,
    contactless: true,
    foreignTransactions: true,
    nickname: input.nickname?.trim() ?? "",
    color: input.color?.trim() || "#163300",
    isCustom: true,
  };
}
