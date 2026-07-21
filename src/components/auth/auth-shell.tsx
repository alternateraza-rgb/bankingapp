"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { easeOut } from "@/lib/motion";

export function AuthAtmosphere({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-black" />
      <motion.div
        className="absolute -left-1/4 top-[-20%] h-[55%] w-[90%] rounded-full bg-white/[0.07] blur-[100px]"
        animate={
          reduce
            ? undefined
            : { opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-[-10%] h-[45%] w-[70%] rounded-full bg-white/[0.04] blur-[90px]"
        animate={
          reduce
            ? undefined
            : { opacity: [0.25, 0.45, 0.25], x: [0, -20, 0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-black">
      <AuthAtmosphere />
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthHeading({
  title,
  subtitle,
  delay = 0.1,
}: {
  title: string;
  subtitle?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="mt-10">
      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: easeOut, delay }}
        className="font-display text-[2.15rem] font-semibold leading-[1.1] tracking-[-0.045em] text-white"
      >
        {title}
      </motion.h1>
      {subtitle ? (
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: delay + 0.08 }}
          className="mt-3 max-w-[20rem] text-[15px] leading-relaxed text-wise-mute"
        >
          {subtitle}
        </motion.p>
      ) : null}
    </div>
  );
}

export function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          className="h-1 rounded-full bg-white/20"
          animate={{
            width: i === current ? 22 : 8,
            backgroundColor:
              i === current
                ? "rgba(255,255,255,1)"
                : i < current
                  ? "rgba(255,255,255,0.45)"
                  : "rgba(255,255,255,0.18)",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        />
      ))}
    </div>
  );
}
