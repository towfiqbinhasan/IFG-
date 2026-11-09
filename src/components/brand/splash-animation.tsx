"use client";

import { motion } from "framer-motion";
import { Logo } from "./logo";
import { brand } from "@/config/brand";

/** High-tech lab splash animation with radiant pulse & forge energy effect */
export function DefaultSplashAnimation() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsating energy ring 1 */}
        <motion.span
          className="absolute h-36 w-36 rounded-3xl bg-primary/20 blur-xl"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer radiant ring 2 */}
        <motion.span
          className="absolute h-28 w-28 rounded-2xl border-2 border-cyan-400/40"
          initial={{ scale: 0.85, opacity: 0.8, rotate: 0 }}
          animate={{ scale: 1.25, opacity: 0, rotate: 45 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />

        {/* Rotating subtle cyber ring */}
        <motion.div
          className="absolute h-32 w-32 rounded-3xl border border-dashed border-primary/40 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        {/* Central Logo pop-in */}
        <motion.div
          initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="relative z-10"
        >
          <Logo size={96} />
        </motion.div>
      </div>

      <motion.div
        className="text-center space-y-1 z-10"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
      >
        <motion.p
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
        >
          {brand.appName}
        </motion.p>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {brand.tagline}
        </p>
      </motion.div>
    </div>
  );
}
