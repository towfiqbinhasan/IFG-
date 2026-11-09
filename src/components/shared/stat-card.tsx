"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "./motion";
import { cn } from "@/lib/utils";

/** KPI tile: icon, animated number, label. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  suffix,
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className="h-full"
    >
      <Card className={cn("relative overflow-hidden p-4 sm:p-5 border-border/60 bg-gradient-to-br from-card to-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 group", className)}>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</p>
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary shadow-sm border border-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl tracking-tight text-foreground">
          <AnimatedCounter value={value} />
          {suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground/90 font-medium">{hint}</p>}
      </Card>
    </motion.div>
  );
}
