"use client";

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

const markSize = { sm: 28, md: 36, lg: 44, xl: 56 } as const;
const wordClass = {
  sm: "text-[1.35rem]",
  md: "text-[1.75rem]",
  lg: "text-[2.15rem]",
  xl: "text-[2.75rem]",
} as const;

/** Faceted geometric mark — abstract folded planes, Brex energy */
export function NiroMark({
  size = 36,
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
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
      initial={shouldAnimate ? { opacity: 0, scale: 0.88, rotate: -4 } : false}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.55, ease: easeOut }}
    >
      <rect width="40" height="40" rx="10" fill="#000000" />
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.25"
        stroke="white"
        strokeOpacity="0.1"
      />
      {/* Faceted ribbon / crystal — not a letter */}
      <motion.g
        initial={shouldAnimate ? { opacity: 0, y: 3 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
      >
        <path fill="#ffffff" d="M14.2 7.5 L25.8 7.5 L28.5 14.2 L20 18.8 L11.5 14.2 Z" />
        <path fill="#d8d8d8" d="M11.5 14.2 L20 18.8 L20 25.2 L11.5 29.5 Z" />
        <path fill="#ffffff" d="M20 18.8 L28.5 14.2 L28.5 29.5 L20 25.2 Z" />
        <path fill="#bdbdbd" d="M11.5 29.5 L20 25.2 L28.5 29.5 L20 33.2 Z" />
      </motion.g>
    </motion.svg>
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

  const mark =
    variant === "icon" ? (
      <NiroMark size={s} animate={animate} className={className} />
    ) : (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <NiroMark size={s} animate={animate} />
        <motion.span
          className={cn(
            "font-display font-semibold tracking-[-0.045em] text-white leading-none",
            wordClass[size]
          )}
          initial={shouldAnimate ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.2 }}
        >
          niro
        </motion.span>
      </span>
    );

  if (href === null) {
    return (
      <span className="inline-flex" aria-label="Niro">
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
