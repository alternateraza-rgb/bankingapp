"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  Bitcoin,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";

const actions = [
  {
    href: "/send",
    title: "Send money",
    description: "P2P to any Niro handle",
    icon: ArrowUpRight,
  },
  {
    href: "/receive",
    title: "Receive",
    description: "Share your @handle",
    icon: ArrowDownLeft,
  },
  {
    href: "/convert",
    title: "Convert",
    description: "Move money between wallets",
    icon: ArrowLeftRight,
  },
  {
    href: "/cards",
    title: "Cards",
    description: "Spend with a Niro virtual card",
    icon: CreditCard,
  },
  {
    href: "/crypto",
    title: "Crypto",
    description: "Buy and sell BTC, ETH, SOL",
    icon: Bitcoin,
  },
] as const;

export default function PaymentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Payments" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-8">
        {actions.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-[22px] bg-wise-surface px-4 py-4 transition-colors hover:bg-wise-surface-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wise-surface-2 text-wise-green">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">
                {title}
              </span>
              <span className="block text-sm text-wise-mute">{description}</span>
            </span>
          </Link>
        ))}
      </main>
    </div>
  );
}
