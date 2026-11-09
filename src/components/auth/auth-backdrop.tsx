"use client";

import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/*
 * Branded backdrop for the auth screens: deep-navy forge atmosphere,
 * hexagon grid, flowing circuit traces and rising sparks (all from the logo).
 * Deterministic values only, so server and client render identically.
 */

// Circuit traces across the viewport (viewBox 0 0 1440 900).
const TRACES = [
  "M-20 180 H260 L320 120 H560",
  "M1460 220 H1180 L1120 280 H900",
  "M-20 690 H200 L260 750 H480 L520 710",
  "M1460 640 H1250 L1190 580 H980",
  "M380 920 V800 L440 740 V640",
  "M1080 -20 V90 L1020 150 V250",
];
const NODES = [
  [560, 120], [900, 280], [520, 710], [980, 580], [440, 640], [1020, 250],
] as const;

// Rising sparks: left %, delay s, duration s, size px
const SPARKS = [
  [8, 0, 9, 3], [17, 2.5, 11, 2], [26, 5, 10, 4], [38, 1, 12, 2], [47, 6.5, 9, 3], [58, 3, 11, 2],
  [66, 7.5, 10, 3], [74, 0.8, 12, 2], [83, 4.2, 9, 4], [92, 2, 11, 2], [33, 8.5, 10, 3], [88, 9, 12, 2],
] as const;

export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Base atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-blue-50 dark:from-[#050c1b] dark:via-[#071633] dark:to-[#050c1b]" />
        <div className="absolute inset-0 hex-pattern opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        {/* Glow orbs in brand colours */}
        <motion.div
          className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[rgb(21_101_192/0.25)] blur-3xl"
          animate={{ x: [0, 70, 0], y: [0, 40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[rgb(34_176_240/0.25)] blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 -ml-40 -mt-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(95_208_255/0.35),transparent_65%)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Circuit traces: draw in, then a light pulse keeps travelling along them */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {TRACES.map((d, i) => (
            <g key={d}>
              <motion.path
                d={d}
                fill="none"
                stroke="var(--brand-blue)"
                strokeOpacity="0.28"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.8, delay: 0.2 + i * 0.15, ease: "easeInOut" }}
              />
              <motion.path
                d={d}
                fill="none"
                stroke="var(--brand-cyan)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0.08, pathOffset: 0, opacity: 0 }}
                animate={{ pathOffset: [0, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 3.2, delay: 2 + i * 0.7, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
              />
            </g>
          ))}
          {NODES.map(([cx, cy], i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r="5"
              fill="var(--brand-glow)"
              stroke="var(--brand-blue)"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: [0.5, 1, 0.5] }}
              transition={{ scale: { delay: 1.6 + i * 0.12 }, opacity: { duration: 2.4, repeat: Infinity, delay: i * 0.4 } }}
            />
          ))}
        </svg>

        {/* Sparks */}
        {SPARKS.map(([left, delay, dur, s], i) => (
          <motion.span
            key={i}
            className="absolute bottom-0 rounded-full bg-[var(--brand-glow)] shadow-[0_0_10px_2px_rgb(34_176_240/0.6)]"
            style={{ left: `${left}%`, width: s, height: s }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -500, -900], x: [0, i % 2 ? 24 : -24, 0], opacity: [0, 0.9, 0] }}
            transition={{ delay, duration: dur, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </div>

      <ThemeToggle className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]" />
      {children}
    </main>
  );
}
