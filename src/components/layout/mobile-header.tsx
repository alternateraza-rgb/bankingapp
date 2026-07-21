"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  showBack,
  backHref = "/home",
  rightSlot,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between gap-3 bg-black/90 px-4 py-3 backdrop-blur-md",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBack ? (
          <Link
            href={backHref}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wise-surface/5"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
        ) : null}
        {title ? (
          <h1 className="truncate text-lg font-bold text-white">{title}</h1>
        ) : null}
      </div>
      <div className="flex items-center gap-1">{rightSlot}</div>
    </header>
  );
}
