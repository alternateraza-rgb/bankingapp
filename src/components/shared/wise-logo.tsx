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

/** Brex-inspired geometric mark — abstract N as continuous angled bars */
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
      initial={shouldAnimate ? { opacity: 0, scale: 0.86 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: easeOut }}
    >
      <rect width="40" height="40" rx="11" fill="white" />
      <motion.path
        d="M12 28.5V11.5L28 28.5V11.5"
        stroke="black"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.85, ease: easeOut, delay: 0.12 }}
      />
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
            "font-display font-semibold tracking-[-0.04em] text-white leading-none",
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
