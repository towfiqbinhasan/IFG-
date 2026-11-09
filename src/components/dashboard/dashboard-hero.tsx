"use client";

import { motion } from "framer-motion";
import { BookCheck, BookOpen, Clock, Flame, type LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/motion";

const HEX = "M60 4 L112 34 L112 94 L60 124 L8 94 L8 34 Z";

export interface HeroStats {
  completed: number;
  reading: number;
  streak: number;
  bestStreak: number;
  hours: number;
}

/**
 * Dashboard header: date, greeting, a one-line status sentence, the main
 * actions, and the member's four headline numbers on glass tiles.
 */
export function DashboardHero({
  eyebrow,
  title,
  summary,
  actions,
  stats,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  actions: React.ReactNode;
  stats: HeroStats;
}) {
  const tiles: { label: string; value: number; suffix?: string; hint: string; icon: LucideIcon }[] = [
    { label: "Papers read", value: stats.completed, hint: "Completed", icon: BookCheck },
    { label: "In progress", value: stats.reading, hint: "Reading now", icon: BookOpen },
    { label: "Streak", value: stats.streak, suffix: "d", hint: `Best ${stats.bestStreak} days`, icon: Flame },
    { label: "Time reading", value: stats.hours, suffix: "h", hint: "Logged in total", icon: Clock },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-forge text-white shadow-xl shadow-sky-900/20"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 hex-pattern opacity-60 mix-blend-overlay" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(95_208_255/0.5),transparent_65%)]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg aria-hidden viewBox="0 0 120 128" className="pointer-events-none absolute -right-6 -top-6 hidden h-48 opacity-70 md:block">
        <motion.path d={HEX} fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6 }} />
        <motion.path
          d={HEX}
          fill="none"
          stroke="rgb(95 208 255 / 0.9)"
          strokeWidth="1.5"
          transform="translate(18 18) scale(0.7)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.3 }}
        />
      </svg>

      <div className="relative px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-sky-100/85">{eyebrow}</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm text-sky-50/85 sm:text-base">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.06 } }}
              className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:p-4"
            >
              <div className="flex items-center gap-2 text-sky-100/90">
                <t.icon className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t.label}</span>
              </div>
              <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
                <AnimatedCounter value={t.value} />
                {t.suffix && <span className="ml-0.5 text-base font-semibold text-sky-100/80">{t.suffix}</span>}
              </p>
              <p className="text-xs text-sky-100/75">{t.hint}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
