"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function ActionButton({
  href,
  icon: Icon,
  label,
  className,
}: ActionButtonProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={cn("flex flex-col items-center", className)}
    >
      <Link href={href} className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wise-green text-wise-forest shadow-sm shadow-wise-green/30 transition-shadow">
          <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="text-xs font-semibold text-white">{label}</span>
      </Link>
    </motion.div>
  );
}
