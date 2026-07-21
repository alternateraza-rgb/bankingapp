import { cn } from "@/lib/utils";

export function Skeleton({
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

/** @deprecated Use Skeleton */
export const SkeletonLoader = Skeleton;

