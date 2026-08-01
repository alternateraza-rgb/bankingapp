"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Landmark } from "lucide-react";
import type { CurrencyBalance } from "@/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MainAccountCardProps {
  balances: CurrencyBalance[];
  hidden: boolean;
  currencyCount: number;
  totalLabel: string;
}

export function MainAccountCard({
  balances,
  hidden,
  currencyCount,
  totalLabel,
}: MainAccountCardProps) {
  const grid = balances.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-[28px] bg-wise-surface">
      <div className="account-banner relative flex h-16 items-start justify-between px-4 pt-3">
        <Link
          href="/cards"
          className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
        >
          3 cards ›
        </Link>
        <Image
          src="/brand/wise-icon.png"
          alt=""
          width={28}
          height={28}
          className="rounded-[22%] opacity-95"
          aria-hidden
        />
      </div>
      <div className="px-4 pb-4 pt-3">
        <Link href="/balances/usd" className="block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white">Main account</p>
              <p className="mt-0.5 text-sm text-wise-mute">
                {hidden ? "••••" : totalLabel} · {currencyCount} currencies
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-wise-mute" aria-hidden />
          </div>
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {grid.map((b) => (
            <Link
              key={b.currency}
              href={`/balances/${b.currency.toLowerCase()}`}
              className={cn(
                "flex items-center gap-2.5 rounded-[18px] bg-wise-surface-2 px-3 py-3 transition-colors hover:bg-wise-surface-3"
              )}
            >
              <span className="text-xl" aria-hidden>
                {b.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="balance-amount block truncate text-sm font-semibold text-white">
                  {hidden
                    ? "••••"
                    : formatMoney(b.amount, b.currency)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-wise-mute-2" />
            </Link>
          ))}
        </div>

        <Link
          href="/balances/usd?action=receive"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-wise-surface-2 text-sm font-semibold text-wise-green transition-colors hover:bg-wise-surface-3"
        >
          <Landmark className="h-4 w-4" aria-hidden />
          Account details
        </Link>
      </div>
    </div>
  );
}
