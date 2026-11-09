"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Animated 0-100 % bar in the forge gradient (green when complete). */
export function ProgressBar({
  value,
  size = "md",
  showLabel = true,
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn("relative flex-1 overflow-hidden rounded-full bg-muted", h)}
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${v}% complete`}
      >
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", v === 100 ? "bg-emerald-500" : "bg-forge")}
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {v > 0 && v < 100 && (
          <motion.div
            className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ left: "-10%" }}
            animate={{ left: `${v}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </div>
      {showLabel && (
        <span className={cn("w-10 text-right font-display font-bold tabular-nums", size === "lg" ? "text-lg" : "text-sm")}>{v}%</span>
      )}
    </div>
  );
}
