"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The app logo: the emblem on a rounded white tile (public/logo.svg; navy
 * public/logo-dark.svg in dark mode) with an
 * optional cyan "forge glow" and two-line wordmark. Every logo placement
 * (header, sidebar, login, splash, offline, 404) uses this component, so
 * replacing public/logo.svg changes the logo everywhere.
 */
export function Logo({
  size = 36,
  withText = false,
  glow = false,
  className,
}: {
  size?: number;
  withText?: boolean;
  /** Pulsing cyan glow behind the tile (login / hero use). */
  glow?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("group inline-flex select-none items-center gap-2.5", className)}>
      <motion.span
        whileHover={{ scale: 1.06, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="relative inline-flex shrink-0"
        style={{ width: size, height: size }}
      >
        {glow && (
          <span
            aria-hidden
            className="absolute -inset-[18%] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgb(34_176_240/0.55),transparent_68%)] blur-md"
          />
        )}
        {/* White tile in light mode, navy tile with a cyan rim in dark mode. */}
        <Image
          src={brand.logoSrc}
          alt={`${brand.appName} logo`}
          width={size}
          height={size}
          priority
          unoptimized
          className="relative rounded-[22%] shadow-sm ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-[0_0_22px_rgb(34_176_240/0.45)] dark:hidden"
        />
        <Image
          src={brand.logoDarkSrc}
          alt={`${brand.appName} logo`}
          width={size}
          height={size}
          priority
          unoptimized
          className="relative hidden rounded-[22%] shadow-[0_0_14px_rgb(34_176_240/0.25)] transition-shadow duration-300 group-hover:shadow-[0_0_24px_rgb(34_176_240/0.55)] dark:block"
        />
      </motion.span>
      {withText && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-display text-[13px] font-extrabold uppercase tracking-tight text-brand-navy dark:text-white">
            {brand.wordmark.top}
          </span>
          <span className="mt-1 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.22em]">
            <span className="text-forge">{brand.wordmark.bottom}</span>
            <span className="h-px w-3 bg-[rgb(34_176_240/0.6)]" />
            <span className="text-muted-foreground">{brand.tagline}</span>
          </span>
        </span>
      )}
    </span>
  );
}
