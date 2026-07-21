"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CreditCard,
  Users,
  ArrowLeftRight,
  HelpCircle,
  User,
  Bitcoin,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NiroLogo } from "@/components/shared/wise-logo";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/send", label: "Send", icon: ArrowLeftRight },
  { href: "/receive", label: "Receive", icon: ArrowDownLeft },
  { href: "/crypto", label: "Crypto", icon: Bitcoin },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/recipients", label: "Recipients", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/help", label: "Help", icon: HelpCircle },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/5 bg-wise-bg px-4 py-6 lg:flex">
      <div className="mb-8 px-2">
        <NiroLogo href="/home" />
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-wise-surface-2 text-white"
                  : "text-wise-mute hover:bg-wise-surface hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="px-2 text-xs text-wise-mute-2">Niro · money, simply</p>
    </aside>
  );
}
