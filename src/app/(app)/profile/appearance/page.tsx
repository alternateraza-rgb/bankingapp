"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AppSettings } from "@/types";

const options: { id: AppSettings["appearance"]; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "Sage canvas (default)" },
  { id: "system", label: "System", hint: "Follow device setting" },
  { id: "dark", label: "Dark", hint: "Coming soon" },
];

export default function AppearancePage() {
  const appearance = useAppStore((s) => s.settings.appearance);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Appearance" showBack backHref="/profile" />
      <main className="space-y-3 px-4 pb-8">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              updateSettings({ appearance: opt.id });
              toast.success(`${opt.label} appearance selected`);
            }}
            className={cn(
              "flex w-full flex-col rounded-[20px] border bg-wise-surface px-4 py-4 text-left",
              appearance === opt.id
                ? "border-wise-forest ring-2 ring-wise-green"
                : "border-transparent"
            )}
          >
            <span className="font-semibold text-white">{opt.label}</span>
            <span className="text-sm text-wise-mute">{opt.hint}</span>
          </button>
        ))}
      </main>
    </div>
  );
}
