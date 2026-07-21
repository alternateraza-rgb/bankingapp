"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { src: string; bg?: string }> = {
  BTC: { src: "/crypto/btc.svg" },
  ETH: { src: "/crypto/eth.svg" },
  SOL: { src: "/crypto/sol.svg" },
  bitcoin: { src: "/crypto/btc.svg" },
  ethereum: { src: "/crypto/eth.svg" },
  solana: { src: "/crypto/sol.svg" },
};

export function CryptoIcon({
  asset,
  size = 40,
  className,
}: {
  asset: string;
  size?: number;
  className?: string;
}) {
  const key = asset.toUpperCase();
  const entry =
    ICONS[key] ??
    ICONS[asset.toLowerCase()] ??
    null;

  if (!entry) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-wise-surface-2 text-xs font-bold text-white",
          className
        )}
        style={{ width: size, height: size }}
      >
        {key.slice(0, 1)}
      </span>
    );
  }

  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={entry.src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full"
        unoptimized
      />
    </span>
  );
}
