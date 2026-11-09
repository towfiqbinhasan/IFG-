import type { PaperWithRelations, PreparationWithRelations } from "./types";

/**
 * Shared PostgREST select strings so every page joins the same shape.
 * `author:profiles(...)` aliases the FK join; `paper_topics(topics(*))` is
 * flattened by `normalizePapers`.
 */
export const PAPER_SELECT =
  "*, author:profiles!papers_user_id_fkey(id, username, full_name, avatar_url), paper_topics(topics(*))";

export const SUBMISSION_SELECT =
  "*, author:profiles!submissions_user_id_fkey(id, username, full_name, avatar_url), venue:venues(id, name, type)";

type RawPaper = Omit<PaperWithRelations, "topics"> & {
  paper_topics?: { topics: PaperWithRelations["topics"][number] | null }[];
};

/** Flatten paper_topics -> topics[] */
export function normalizePapers(rows: unknown[] | null): PaperWithRelations[] {
  return ((rows ?? []) as RawPaper[]).map(({ paper_topics, ...p }) => ({
    ...p,
    topics: (paper_topics ?? []).map((pt) => pt.topics).filter(Boolean) as PaperWithRelations["topics"],
  }));
}

export const PREP_SELECT =
  "*, author:profiles!preparations_user_id_fkey(id, username, full_name, avatar_url), topic:topics(id, name, color), updates:preparation_updates(*)";

/** Sort each preparation's updates newest-first. */
export function normalizePreps(rows: unknown[] | null): PreparationWithRelations[] {
  return ((rows ?? []) as PreparationWithRelations[]).map((p) => ({
    ...p,
    updates: [...(p.updates ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }));
}

/** True when a Supabase error means "table doesn't exist yet" (migration not run). */
export function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

/** Progress updates joined to their preparation + author, for feeds. */
export const PREP_UPDATE_FEED_SELECT =
  "*, preparation:preparations(id, title, progress, author:profiles!preparations_user_id_fkey(id, username, full_name, avatar_url), topic:topics(id, name, color))";
