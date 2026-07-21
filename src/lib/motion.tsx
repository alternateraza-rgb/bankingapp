"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easePremium = [0.16, 1, 0.3, 1] as const;
export const easeSoft = [0.33, 1, 0.68, 1] as const;

export function useMotionSafe() {
  const reduced = useReducedMotion();
  return !reduced;
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easePremium },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.25, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easePremium },
  },
};

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const animate = useMotionSafe();

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easePremium }}
    >
      {children}
    </motion.div>
  );
}

export function MotionList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const animate = useMotionSafe();
  if (!animate) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const animate = useMotionSafe();
  if (!animate) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={listItem}>
      {children}
    </motion.div>
  );
}
