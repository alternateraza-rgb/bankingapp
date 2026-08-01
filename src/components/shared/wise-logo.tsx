"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WiseLogoProps {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
  /** icon = mark only; wordmark = mark + "wise"; badge = full official lockup */
  variant?: "wordmark" | "icon" | "badge";
}

const iconSize = { sm: 28, md: 34, lg: 48 } as const;
const textSize = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" } as const;
const badgeSize = {
  sm: { w: 120, h: 40 },
  md: { w: 160, h: 52 },
  lg: { w: 220, h: 72 },
} as const;

export function WiseLogo({
  className,
  href = "/home",
  size = "md",
  variant = "wordmark",
}: WiseLogoProps) {
  let mark: React.ReactNode;

  if (variant === "badge") {
    const dims = badgeSize[size];
    mark = (
      <Image
        src="/brand/wise-wordmark.png"
        alt="Wise"
        width={dims.w}
        height={dims.h}
        className={cn("rounded-2xl object-contain", className)}
        priority
      />
    );
  } else if (variant === "icon") {
    mark = (
      <Image
        src="/brand/wise-icon.png"
        alt="Wise"
        width={iconSize[size]}
        height={iconSize[size]}
        className={cn("rounded-[22%] object-contain", className)}
        priority
      />
    );
  } else {
    mark = (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Image
          src="/brand/wise-icon.png"
          alt=""
          width={iconSize[size]}
          height={iconSize[size]}
          className="rounded-[22%] object-contain"
          priority
          aria-hidden
        />
        <span
          className={cn(
            "font-bold lowercase tracking-tight text-white leading-none",
            textSize[size]
          )}
        >
          wise
        </span>
      </span>
    );
  }

  if (href === null) {
    return (
      <span className="inline-flex" aria-label="Wise">
        {mark}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center focus-visible:rounded-md"
      aria-label="Wise home"
    >
      {mark}
    </Link>
  );
}
