import { cn } from "@/lib/utils";

/** Shimmering placeholder block used by loading.tsx files. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/5",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
