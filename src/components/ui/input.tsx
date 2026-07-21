import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-wise-mute-2 transition-all duration-200 focus-visible:outline-none focus-visible:border-white/25 focus-visible:bg-white/[0.06] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
