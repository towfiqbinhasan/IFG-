import { format, subMonths, startOfDay, differenceInCalendarDays, parseISO } from "date-fns";
import type { PaperWithRelations } from "./types";
import { monthKey } from "./utils";

/** Papers per month for the last `months` months (zero-filled). Uses date_read, falls back to created_at. */
export function papersPerMonth(papers: Pick<PaperWithRelations, "date_read" | "created_at">[], months = 12) {
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) buckets.set(monthKey(subMonths(now, i)), 0);
  for (const p of papers) {
    const key = monthKey(p.date_read ?? p.created_at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([key, count]) => ({
    key,
    label: format(parseISO(`${key}-01`), "MMM"),
    count,
  }));
}

/** Topic counts sorted desc. Top `limit` kept, the rest folded into "Other". */
export function topicCounts(papers: Pick<PaperWithRelations, "topics">[], limit = 6) {
  const counts = new Map<string, number>();
  for (const p of papers) for (const t of p.topics) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
  const sorted = Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const other = sorted.slice(limit - 1).reduce((s, t) => s + t.value, 0);
  return [...head, { name: "Other", value: other }];
}

/** Count by an arbitrary key, sorted desc. */
export function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/**
 * Reading streak = consecutive days (ending today or yesterday) on which the
 * member logged at least one paper with a date_read. Returns current and best.
 */
export function readingStreak(papers: Pick<PaperWithRelations, "date_read">[]) {
  const days = Array.from(
    new Set(papers.filter((p) => p.date_read).map((p) => startOfDay(parseISO(p.date_read!)).getTime())),
  ).sort((a, b) => b - a);
  if (!days.length) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = differenceInCalendarDays(days[i - 1]!, days[i]!) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const today = startOfDay(new Date());
  let current = 0;
  const gap = differenceInCalendarDays(today, days[0]!);
  if (gap <= 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (differenceInCalendarDays(days[i - 1]!, days[i]!) === 1) current++;
      else break;
    }
  }
  return { current, best: Math.max(best, current) };
}
