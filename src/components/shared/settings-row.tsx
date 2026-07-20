"use client";

import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface SettingsRowProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  toggle?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  danger?: boolean;
  className?: string;
}

export function SettingsRow({
  icon: Icon,
  label,
  description,
  value,
  onClick,
  toggle,
  checked,
  onCheckedChange,
  danger,
  className,
}: SettingsRowProps) {
  const content = (
    <>
      {Icon ? (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            danger ? "bg-red-50 text-wise-negative" : "bg-secondary text-wise-forest"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block text-[15px] font-semibold",
            danger ? "text-wise-negative" : "text-white"
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-sm text-wise-mute">
            {description}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="text-sm text-wise-mute">{value}</span>
      ) : null}
      {toggle ? (
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      ) : onClick ? (
        <ChevronRight className="h-5 w-5 text-wise-mute" aria-hidden />
      ) : null}
    </>
  );

  if (toggle) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-wise-surface-2/60 focus-visible:bg-wise-surface-2/60",
        className
      )}
    >
      {content}
    </button>
  );
}
