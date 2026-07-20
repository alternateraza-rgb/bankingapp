import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wise-green focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98] min-h-11 min-w-11",
  {
    variants: {
      variant: {
        primary:
          "bg-wise-green text-wise-forest hover:bg-wise-green-active rounded-full px-6",
        secondary:
          "bg-wise-surface-2 text-wise-green hover:bg-wise-surface-3 rounded-full px-6",
        ghost:
          "bg-transparent text-white hover:bg-wise-surface/5 rounded-full px-4",
        outline:
          "border border-white/20 bg-transparent text-white hover:bg-wise-surface/5 rounded-full px-6",
        destructive:
          "bg-wise-negative text-white hover:opacity-90 rounded-full px-6",
        soft: "bg-wise-green-dim text-wise-green hover:bg-wise-surface-3 rounded-full px-6",
        dark: "bg-wise-surface-2 text-white hover:bg-wise-surface-3 rounded-full px-6",
      },
      size: {
        default: "h-12 text-[15px]",
        sm: "h-9 text-sm px-4",
        lg: "h-14 text-base px-8",
        icon: "h-11 w-11 rounded-full p-0",
        pill: "h-9 text-sm px-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
