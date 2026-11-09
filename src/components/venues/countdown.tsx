"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { URGENCY_STYLES, urgencyOf } from "@/lib/deadlines";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * Live countdown to `date`, ticking every second. Colour-coded by urgency
 * (green > 30d, yellow 7–30d, red < 7d, grey passed) and always labelled
 * with text so colour is never the only signal.
 */
export function Countdown({ date, compact = false, className }: { date: string | Date; compact?: boolean; className?: string }) {
  const target = typeof date === "string" ? new Date(date) : date;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Avoid hydration mismatch: render a neutral placeholder on the server.
  if (!now) return <span className={cn("inline-block h-6 w-24 animate-pulse rounded-full bg-muted", className)} />;

  const urgency = urgencyOf(target, now);
  const style = URGENCY_STYLES[urgency];
  const diff = target.getTime() - now.getTime();
  const { d, h, m, s } = parts(diff);

  let text: string;
  if (urgency === "passed") text = "Passed";
  else if (compact) text = d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`;
  else text = d > 0 ? `${d}d ${h}h ${m}m left` : `${h}h ${m}m ${s}s left`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", style.badge, className)}
      title={style.label}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot, urgency === "urgent" && "animate-pulse")} />
      {text}
    </span>
  );
}

/** Legend for the four urgency colours. */
export function UrgencyLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(Object.keys(URGENCY_STYLES) as (keyof typeof URGENCY_STYLES)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", URGENCY_STYLES[k].dot)} />
          {URGENCY_STYLES[k].label}
        </span>
      ))}
    </div>
  );
}
