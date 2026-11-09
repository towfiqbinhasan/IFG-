import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PAPER_SELECT, normalizePapers } from "./queries";
import { upcomingDeadlines } from "./deadlines";
import type { Venue } from "./types";

/** Loads everything the LabStats component needs. */
export async function loadLabStats(supabase: SupabaseClient) {
  const [{ data: rows }, members, topics, { data: venues }, subs] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("topics").select("id", { count: "exact", head: true }),
    supabase.from("venues").select("*"),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
  ]);
  const upcoming = new Set(upcomingDeadlines((venues ?? []) as Venue[]).map((e) => e.venue.id)).size;
  return {
    papers: normalizePapers(rows),
    memberCount: members.count ?? 0,
    topicCount: topics.count ?? 0,
    upcomingVenues: upcoming,
    submissionCount: subs.count ?? 0,
  };
}
