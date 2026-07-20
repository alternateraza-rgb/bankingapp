"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Home, CreditCard, Users, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/recipients", label: "Recipients", icon: Users },
  { href: "/payments", label: "Payments", icon: ArrowLeftRight },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 glass-nav border-t border-white/5 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-[64px] max-w-lg items-stretch justify-around px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200",
                  active ? "text-white" : "text-wise-mute"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {active && !reduce ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-wise-surface-3"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                      }}
                    />
                  ) : active ? (
                    <span className="absolute inset-0 rounded-full bg-wise-surface-3" />
                  ) : null}
                  <Icon
                    className="relative z-10 h-[22px] w-[22px]"
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
