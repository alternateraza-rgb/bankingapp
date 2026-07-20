import { cn } from "@/lib/utils";

export function SkeletonLoader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-wise-surface-2", className)}
      {...props}
    />
  );
}
