"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The app logo with interactive glowing animation and smooth effects.
 * Every logo placement (header, sidebar, login, splash) uses this component.
 */
export function Logo({
  size = 36,
  withText = false,
  className,
  animated = false,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      <motion.div
        whileHover={{ scale: 1.06, rotate: 1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-background/95 p-0.5 shadow-sm transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-[0_0_20px_rgba(42,120,214,0.35)]"
        style={{ width: size, height: size }}
      >
        {/* Animated ambient glow ring */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-primary/20 to-blue-600/10 opacity-70 group-hover:opacity-100 transition-opacity" />
        
        <Image
          src={brand.logoSrc}
          alt={`${brand.appName} logo`}
          fill
          sizes={`${size}px`}
          className="object-contain rounded-lg p-0.5 transition-transform duration-300 group-hover:scale-105"
          priority
          unoptimized
        />
      </motion.div>
      {withText && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {brand.appName}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{brand.tagline}</span>
        </span>
      )}
    </span>
  );
}
