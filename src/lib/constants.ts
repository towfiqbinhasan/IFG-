/**
 * Domain constants shared by forms, filters and badges.
 * Values MUST match the CHECK constraints in supabase/schema.sql.
 */
export const PAPER_TYPES = ["Survey", "Empirical", "Theoretical", "Review", "Case study", "Dataset", "Other"] as const;
export type PaperType = (typeof PAPER_TYPES)[number];

export const PAPER_STATUSES = ["To read", "Reading", "Completed"] as const;
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export const READ_METHODS = [
  { value: "full_read", label: "Full read" },
  { value: "skim", label: "Skim" },
  { value: "abstract_only", label: "Abstract only" },
  { value: "group_discussion", label: "Group discussion" },
] as const;
export type ReadMethod = (typeof READ_METHODS)[number]["value"];

export const SUBMISSION_STATUSES = ["Planning", "Writing", "Submitted", "Accepted", "Rejected"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const VENUE_TYPES = ["conference", "journal"] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

/** The four deadline kinds a venue can carry, in chronological order. */
export const DEADLINE_FIELDS = [
  { key: "abstract_deadline", label: "Abstract" },
  { key: "submission_deadline", label: "Full paper" },
  { key: "notification_date", label: "Notification" },
  { key: "camera_ready_date", label: "Camera-ready" },
] as const;
export type DeadlineKey = (typeof DEADLINE_FIELDS)[number]["key"];

export function readMethodLabel(v?: string | null) {
  return READ_METHODS.find((m) => m.value === v)?.label ?? "—";
}

export const STATUS_STYLES: Record<string, string> = {
  "To read": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Reading: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Writing: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Submitted: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  Accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  Active: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Paused: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/** Categorical series colours (validated colour-blind-safe order). Index = slot. */
export const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

/** Preparation (progress tracker) categories & statuses - must match migration 003. */
export const PREP_CATEGORIES = ["Topic study", "Paper writing", "Experiment", "Exam / Course", "Skill", "Other"] as const;
export type PrepCategory = (typeof PREP_CATEGORIES)[number];
export const PREP_STATUSES = ["Active", "Paused", "Completed"] as const;
export type PrepStatus = (typeof PREP_STATUSES)[number];
