"use client";

import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Flag, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreparationUpdate } from "@/lib/types";

/** Vertical timeline of progress updates (newest first) with the change at each step. */
export function PrepTimeline({ updates }: { updates: PreparationUpdate[] }) {
  if (!updates.length) return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {updates.map((u, i) => {
        const prev = updates[i + 1];
        const delta = prev ? u.progress - prev.progress : null;
        const Icon = u.progress === 100 ? Trophy : !prev ? Flag : delta !== null && delta < 0 ? ArrowDownRight : ArrowUpRight;
        return (
          <motion.li
            key={u.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i, 12) * 0.04 } }}
            className="relative"
          >
            <span
              className={cn(
                "absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background",
                u.progress === 100 ? "text-emerald-600" : "text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg font-extrabold tabular-nums">{u.progress}%</span>
                {delta !== null && delta !== 0 && (
                  <span className={cn("text-xs font-semibold", delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {delta > 0 ? "+" : ""}
                    {delta}%
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground" title={format(new Date(u.created_at), "PPpp")}>
                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </span>
              </div>
              {u.note && <p className="mt-1 whitespace-pre-wrap text-sm">{u.note}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
