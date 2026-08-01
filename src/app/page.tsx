"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { WiseLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";

export default function WelcomePage() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden bg-black px-5 py-10 safe-pt safe-pb">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <WiseLogo href={null} size="lg" />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.35, ease: easeOut }}
          className="mt-6 inline-flex rounded-full bg-wise-green px-3 py-1 text-xs font-bold text-wise-forest"
        >
          International money
        </motion.div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: easeOut }}
          className="mt-8 text-4xl font-bold tracking-tight text-white"
        >
          Money that moves with you
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: easeOut }}
          className="mt-4 text-base leading-relaxed text-wise-body"
        >
          Hold money in multiple currencies, convert at the mid-market rate, and
          send internationally with transparent fees.
        </motion.p>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: easeOut }}
        className="space-y-3"
      >
        <Button asChild className="w-full" size="lg">
          <Link href="/onboarding">Get started</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/login">Continue</Link>
        </Button>
      </motion.div>
    </div>
  );
}
