"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "@/config/brand";

/*
 * "Forging" splash sequence, built around the logo's motifs:
 *   0.0s  hexagon frame draws itself (navy -> cyan stroke)
 *   0.5s  circuit traces shoot out of the frame and light their nodes
 *   0.7s  the emblem ignites in the centre with a pulsing flame glow
 *   0.9s  sparks rise from the anvil
 *   1.0s  the wordmark is struck in, letter by letter
 *   -->   a progress "heat bar" fills for brand.splash.minDurationMs
 * All positions are deterministic (no Math.random) so SSR and client match.
 */

// Pointy-top hexagon in a 240x264 box (matches the logo frame).
const HEX = "M120 8 L228 70 L228 194 L120 256 L12 194 L12 70 Z";

// Circuit traces leaving the frame: [path, node x, node y]
const TRACES: [string, number, number][] = [
  ["M228 92 H252 V70", 252, 70],
  ["M228 172 H256", 256, 172],
  ["M12 104 H-12 V84", -12, 84],
  ["M12 160 H-16", -16, 160],
  ["M150 25 L164 6 H184", 184, 6],
  ["M90 25 L76 6 H58", 58, 6],
];

// Sparks rising from the anvil: x offset (px), delay (s), duration (s), size (px)
const SPARKS = [
  [-34, 0.9, 1.6, 4], [-18, 1.1, 1.9, 3], [-6, 0.95, 1.5, 5], [8, 1.2, 1.8, 3], [22, 1.0, 1.7, 4],
  [36, 1.3, 2.0, 3], [-26, 1.5, 1.6, 3], [14, 1.6, 1.9, 4], [-10, 1.8, 1.7, 3], [30, 1.9, 1.6, 3],
  [-40, 2.0, 1.8, 2], [2, 2.1, 1.5, 4], [44, 2.2, 1.9, 2], [-22, 2.3, 1.7, 3],
] as const;

export function DefaultSplashAnimation() {
  const top = brand.wordmark.top.toUpperCase().split("");
  const durationS = brand.splash.minDurationMs / 1000;

  return (
    <div className="relative flex w-full flex-col items-center gap-8 px-4">
      {/* Ambient backdrop: radial forge glow + hex grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 hex-pattern opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
        <motion.div
          className="absolute left-1/2 top-[42%] -ml-[17rem] -mt-[17rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgb(34_176_240/0.28),transparent_65%)]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>

      {/* Emblem stage */}
      <div className="relative h-[220px] w-[200px] sm:h-[264px] sm:w-[240px]">
        <svg viewBox="-20 0 280 264" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="forge-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-navy)" />
              <stop offset="55%" stopColor="var(--brand-blue)" />
              <stop offset="100%" stopColor="var(--brand-cyan)" />
            </linearGradient>
            <filter id="forge-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Glow copy of the frame */}
          <motion.path
            d={HEX}
            fill="none"
            stroke="var(--brand-cyan)"
            strokeWidth="8"
            filter="url(#forge-blur)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.9, 0.45] }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          {/* Frame */}
          <motion.path
            d={HEX}
            fill="none"
            stroke="url(#forge-stroke)"
            strokeWidth="6"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />

          {/* Circuit traces + nodes */}
          {TRACES.map(([d, cx, cy], i) => (
            <g key={d}>
              <motion.path
                d={d}
                fill="none"
                stroke="var(--brand-cyan)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.45, ease: "easeOut" }}
              />
              <motion.circle
                cx={cx}
                cy={cy}
                r="4.5"
                fill="var(--brand-glow)"
                stroke="var(--brand-blue)"
                strokeWidth="2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.6, 1], opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.08, duration: 0.4 }}
              />
            </g>
          ))}
        </svg>

        {/* Flame glow behind the emblem */}
        {/* (Centred with flex: Framer's transform would override Tailwind translate classes.) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            aria-hidden
            className="h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(95_208_255/0.75),rgb(34_176_240/0.25)_45%,transparent_70%)] blur-xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1, 1.12, 1], opacity: [0, 1, 0.85, 1, 0.85] }}
            transition={{ delay: 0.6, duration: 2.4, ease: "easeInOut" }}
          />
        </div>

        {/* Emblem ignites */}
        <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-[58%]"
          initial={{ scale: 0.4, opacity: 0, filter: "blur(12px) brightness(2)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px) brightness(1)" }}
          transition={{ delay: 0.7, type: "spring", stiffness: 180, damping: 16 }}
        >
          <Image
            src={brand.emblemSrc}
            alt=""
            width={280}
            height={280}
            priority
            unoptimized
            className="aspect-square w-full rounded-[22%] shadow-2xl shadow-sky-500/30 ring-1 ring-white/40"
          />
        </motion.div>
        </div>

        {/* Sparks */}
        {SPARKS.map(([x, delay, dur, s], i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute left-1/2 top-[62%] rounded-full bg-[var(--brand-glow)] shadow-[0_0_8px_2px_rgb(34_176_240/0.7)]"
            style={{ width: s, height: s }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: [0, x * 0.6, x], y: [0, -70, -150], opacity: [0, 1, 0] }}
            transition={{ delay, duration: dur, ease: "easeOut", repeat: Infinity, repeatDelay: 0.6 }}
          />
        ))}
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <p className="font-display text-xl font-extrabold tracking-tight text-brand-navy dark:text-white sm:text-2xl" aria-label={brand.wordmark.top}>
          {top.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 1.0 + i * 0.03, duration: 0.35 }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </p>
        <motion.p
          className="mt-1 font-display text-2xl font-extrabold uppercase text-forge sm:text-3xl"
          initial={{ opacity: 0, scale: 1.6, letterSpacing: "1em", paddingLeft: "1em" }}
          animate={{ opacity: 1, scale: 1, letterSpacing: "0.45em", paddingLeft: "0.45em" }}
          transition={{ delay: 1.0 + top.length * 0.03, duration: 0.5, ease: "easeOut" }}
        >
          {brand.wordmark.bottom}
        </motion.p>
        <motion.p
          className="mt-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        >
          {brand.tagline}
        </motion.p>
      </div>

      {/* Heat bar */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-forge"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: durationS, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}
