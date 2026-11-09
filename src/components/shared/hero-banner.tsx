"use client";

import { motion } from "framer-motion";

/** Pointy-top hexagon (logo frame) used as decoration. */
const HEX = "M60 4 L112 34 L112 94 L60 124 L8 94 L8 34 Z";

/**
 * Branded page hero: forge gradient, hex texture, glowing hexagon outlines
 * and a soft flame glow. Used for the dashboard greeting.
 */
export function HeroBanner({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl bg-forge px-5 py-7 text-white shadow-xl shadow-sky-900/20 sm:px-8 sm:py-9"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 hex-pattern opacity-60 mix-blend-overlay" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/2 -mt-36 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(95_208_255/0.55),transparent_65%)]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg aria-hidden viewBox="0 0 120 128" className="pointer-events-none absolute -right-4 top-1/2 hidden h-56 -translate-y-1/2 sm:block">
        <motion.path
          d={HEX}
          fill="none"
          stroke="rgb(255 255 255 / 0.55)"
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        <motion.path
          d={HEX}
          fill="none"
          stroke="rgb(95 208 255 / 0.9)"
          strokeWidth="1.5"
          transform="translate(18 18) scale(0.7)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
        />
      </svg>

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:pr-40">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.3em] text-sky-100/90">{eyebrow}</p>
          )}
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-xl text-sm text-sky-50/85">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </motion.section>
  );
}
