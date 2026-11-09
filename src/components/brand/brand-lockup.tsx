"use client";

import { motion } from "framer-motion";
import { Logo } from "./logo";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The full logo lockup, exactly like the brand artwork: emblem on top,
 * "THE INTELLIGENCE FORGE" and a wide-tracked "LAB" underneath.
 * Used on login, password, 404, offline and error screens.
 */
export function BrandLockup({
  size = 80,
  glow = true,
  tagline,
  className,
}: {
  size?: number;
  glow?: boolean;
  /** Small line under the wordmark (defaults to none). */
  tagline?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <motion.div
        initial={{ rotate: -10, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.05 }}
      >
        <Logo size={size} glow={glow} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-5 font-display text-lg font-extrabold uppercase leading-tight tracking-tight text-brand-navy dark:text-white"
      >
        {brand.wordmark.top}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.9em" }}
        animate={{ opacity: 1, letterSpacing: "0.45em" }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="pl-[0.45em] font-display text-xl font-extrabold uppercase text-forge"
      >
        {brand.wordmark.bottom}
      </motion.p>
      {tagline && <div className="mt-3 text-sm text-muted-foreground">{tagline}</div>}
    </div>
  );
}
