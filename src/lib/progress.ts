import { differenceInCalendarDays } from "date-fns";

/**
 * Target-date label, e.g. "12 days left" / "3 days overdue".
 * Lives in lib (not a "use client" file) so server pages can call it too.
 */
export function targetLabel(date: string | null, status: string) {
  if (!date) return null;
  const d = differenceInCalendarDays(new Date(date), new Date());
  if (status === "Completed") return { text: "Target " + new Date(date).toLocaleDateString(), tone: "muted" as const };
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} overdue`, tone: "bad" as const };
  if (d === 0) return { text: "Due today", tone: "warn" as const };
  return { text: `${d} day${d === 1 ? "" : "s"} left`, tone: d <= 7 ? ("warn" as const) : ("muted" as const) };
}
