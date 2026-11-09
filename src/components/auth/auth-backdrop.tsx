"use client";

import { motion } from "framer-motion";
import { BookOpen, FileText, FlaskConical, GraduationCap, Microscope, Sigma } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const FLOATERS = [
  { Icon: FileText, x: "8%", y: "18%", d: 0 },
  { Icon: BookOpen, x: "82%", y: "14%", d: 0.6 },
  { Icon: FlaskConical, x: "14%", y: "76%", d: 1.2 },
  { Icon: Microscope, x: "86%", y: "70%", d: 0.3 },
  { Icon: Sigma, x: "70%", y: "42%", d: 0.9 },
  { Icon: GraduationCap, x: "24%", y: "46%", d: 1.5 },
];

/** Animated gradient + floating icons behind the auth cards. */
export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/15 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {FLOATERS.map(({ Icon, x, y, d }, i) => (
          <motion.div
            key={i}
            className="absolute hidden text-primary/25 sm:block"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -14, 0], rotate: [0, 6, 0] }}
            transition={{ opacity: { delay: d, duration: 0.8 }, y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: d }, rotate: { duration: 8 + i, repeat: Infinity } }}
          >
            <Icon className="h-10 w-10" />
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>
      <ThemeToggle className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]" />
      {children}
    </main>
  );
}
