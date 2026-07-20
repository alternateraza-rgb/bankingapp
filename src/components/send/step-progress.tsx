"use client";

import { cn } from "@/lib/utils";

interface StepProgressProps {
  steps: string[];
  current: number;
  className?: string;
}

export function StepProgress({ steps, current, className }: StepProgressProps) {
  return (
    <div className={cn("px-4", className)} aria-label="Progress">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <li key={step} className="flex flex-1 flex-col gap-1.5">
              <span
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  done || active ? "bg-wise-green" : "bg-border"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-white" : "text-wise-mute"
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
