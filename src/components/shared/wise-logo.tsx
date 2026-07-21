"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { easeOut } from "@/lib/motion";

interface NiroLogoProps {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "wordmark" | "icon" | "badge";
  animate?: boolean;
}

const markSize = { sm: 28, md: 34, lg: 44, xl: 56 } as const;
const wordClass = {
  sm: "text-[1.4rem]",
  md: "text-[1.7rem]",
  lg: "text-[2.25rem]",
  xl: "text-[2.85rem]",
} as const;

export function NiroMark({
  size = 34,
  className,
  animate = false,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const shouldAnimate = animate && !reduce;

  return (
    <motion.span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-[22%]", className)}
      style={{ width: size, height: size }}
      initial={shouldAnimate ? { opacity: 0, scale: 0.88 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: easeOut }}
      aria-hidden
    >
      <Image
        src="/brand/niro-icon.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority
      />
    </motion.span>
  );
}

export function NiroLogo({
  className,
  href = "/home",
  size = "md",
  variant = "wordmark",
  animate = false,
}: NiroLogoProps) {
  const reduce = useReducedMotion();
  const shouldAnimate = animate && !reduce;
  const s = markSize[size];

  const wordmark = (
    <motion.span
      className={cn(
        "font-display text-white leading-none",
        wordClass[size]
      )}
      style={{
        fontFamily: "var(--font-niro-display), Syne, sans-serif",
        letterSpacing: "-0.075em",
        fontWeight: 800,
      }}
      initial={shouldAnimate ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: easeOut, delay: 0.12 }}
    >
      niro
    </motion.span>
  );

  const mark =
    variant === "icon" ? (
      <NiroMark size={s} animate={animate} className={className} />
    ) : (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <NiroMark size={s} animate={animate} />
        {wordmark}
      </span>
    );

  if (href === null) {
    return (
      <span className="inline-flex items-center" aria-label="Niro">
        {mark}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center focus-visible:rounded-md"
      aria-label="Niro home"
    >
      {mark}
    </Link>
  );
}

/** @deprecated Use NiroLogo */
export const WiseLogo = NiroLogo;
