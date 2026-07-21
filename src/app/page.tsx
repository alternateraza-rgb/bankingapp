"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { NiroLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";

export default function WelcomePage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden bg-black px-5 py-10 safe-pt safe-pb">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #333 0%, transparent 60%)",
        }}
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="relative"
      >
        <NiroLogo href={null} size="lg" />
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: easeOut }}
          className="mt-14 text-4xl font-semibold tracking-tight text-white"
        >
          Banking,
          <br />
          beautifully simple
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4, ease: easeOut }}
          className="mt-4 max-w-sm text-base leading-relaxed text-wise-mute"
        >
          Multi-currency wallets, instant P2P, virtual Visa cards, and live
          crypto — inspired by the best of modern fintech.
        </motion.p>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: easeOut }}
        className="relative space-y-3"
      >
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </motion.div>
    </div>
  );
}
