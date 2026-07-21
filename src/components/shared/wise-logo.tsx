"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface NiroLogoProps {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "wordmark" | "icon" | "badge";
}

const box = { sm: 28, md: 34, lg: 48 } as const;
const textSize = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" } as const;

function Mark({ size }: { size: "sm" | "md" | "lg" }) {
  const s = box[size];
  return (
    <span
      className="inline-flex items-center justify-center rounded-[22%] bg-white text-black font-black tracking-tighter"
      style={{ width: s, height: s, fontSize: s * 0.42 }}
      aria-hidden
    >
      N
    </span>
  );
}

export function NiroLogo({
  className,
  href = "/home",
  size = "md",
  variant = "wordmark",
}: NiroLogoProps) {
  let mark: React.ReactNode;

  if (variant === "icon") {
    mark = (
      <span className={cn("inline-flex", className)}>
        <Mark size={size} />
      </span>
    );
  } else {
    mark = (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <Mark size={size} />
        <span
          className={cn(
            "font-semibold tracking-tight text-white leading-none",
            textSize[size]
          )}
        >
          Niro
        </span>
      </span>
    );
  }

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
