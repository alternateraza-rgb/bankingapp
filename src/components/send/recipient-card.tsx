"use client";

import { cn } from "@/lib/utils";
import type { Recipient } from "@/types";

interface RecipientCardProps {
  recipient: Recipient;
  selected?: boolean;
  onSelect?: () => void;
}

export function RecipientCard({
  recipient,
  selected,
  onSelect,
}: RecipientCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[20px] border bg-transparent px-4 py-3.5 text-left transition-all",
        selected
          ? "border-wise-green ring-1 ring-wise-green"
          : "border-transparent"
      )}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-wise-forest"
        style={{ backgroundColor: recipient.avatarColor }}
        aria-hidden
      >
        {recipient.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-white">
          {recipient.name}
        </span>
        <span className="block text-sm text-wise-mute">
          {recipient.bankName} · {recipient.currency} · ••
          {recipient.accountLast4}
        </span>
      </span>
      <span className="rounded-full bg-wise-surface-2 px-2 py-0.5 text-[11px] font-semibold capitalize text-wise-mute">
        {recipient.type}
      </span>
    </button>
  );
}
