import { DEADLINE_FIELDS, type DeadlineKey } from "./constants";
import type { Venue } from "./types";

export type Urgency = "safe" | "soon" | "urgent" | "passed";

export interface DeadlineEvent {
  venue: Venue;
  key: DeadlineKey;
  label: string;
  date: Date;
}

/** green > 30 days, yellow 7-30, red < 7, grey passed. */
export function urgencyOf(date: Date, now = new Date()): Urgency {
  const days = (date.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return "passed";
  if (days < 7) return "urgent";
  if (days <= 30) return "soon";
  return "safe";
}

export const URGENCY_STYLES: Record<Urgency, { badge: string; ring: string; dot: string; label: string }> = {
  safe: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    ring: "border-l-emerald-500",
    dot: "bg-emerald-500",
    label: "More than 30 days",
  },
  soon: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    ring: "border-l-amber-500",
    dot: "bg-amber-500",
    label: "7–30 days",
  },
  urgent: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    ring: "border-l-rose-500",
    dot: "bg-rose-500",
    label: "Less than 7 days",
  },
  passed: {
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    ring: "border-l-slate-400",
    dot: "bg-slate-400",
    label: "Passed",
  },
};

/** Flatten venues into individual dated events. */
export function venueEvents(venues: Venue[]): DeadlineEvent[] {
  const out: DeadlineEvent[] = [];
  for (const v of venues)
    for (const f of DEADLINE_FIELDS) {
      const raw = v[f.key];
      if (raw) out.push({ venue: v, key: f.key, label: f.label, date: new Date(raw) });
    }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * The next *actionable* deadline of a venue: the nearest future abstract or
 * full-paper deadline; falls back to any future date, then the latest past one.
 */
export function nextDeadline(v: Venue, now = new Date()): DeadlineEvent | null {
  const events = venueEvents([v]);
  const future = events.filter((e) => e.date >= now);
  const submission = future.find((e) => e.key === "abstract_deadline" || e.key === "submission_deadline");
  return submission ?? future[0] ?? events[events.length - 1] ?? null;
}

/** Upcoming submission deadlines across venues, nearest first. */
export function upcomingDeadlines(venues: Venue[], now = new Date()) {
  return venueEvents(venues)
    .filter((e) => e.date >= now && (e.key === "abstract_deadline" || e.key === "submission_deadline"))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
