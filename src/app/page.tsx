"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { NiroLogo } from "@/components/shared/wise-logo";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";

const lines = ["Money,", "without", "friction."];

export default function WelcomePage() {
  const reduce = useReducedMotion();

  return (
    <AuthShell className="justify-between">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <NiroLogo href={null} size="lg" animate />
      </motion.div>

      <div className="relative my-auto py-10">
        <h1 className="font-display text-[3.15rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
          {lines.map((line, i) => (
            <motion.span
              key={line}
              className="block overflow-hidden"
              initial={reduce ? false : { y: "110%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.7,
                ease: easeOut,
                delay: 0.18 + i * 0.1,
              }}
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: easeOut }}
          className="mt-6 max-w-[19rem] text-[15px] leading-relaxed text-wise-mute"
        >
          Multi-currency accounts, instant transfers, virtual cards, and crypto
          — in one calm, premium banking experience.
        </motion.p>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.5, ease: easeOut }}
        className="space-y-3"
      >
        <Button asChild className="h-14 w-full text-[15px]" size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-14 w-full border-white/15 text-[15px]"
          size="lg"
        >
          <Link href="/login">Sign in</Link>
        </Button>
      </motion.div>
    </AuthShell>
  );
}
