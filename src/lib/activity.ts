import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityItem } from "@/components/members/activity-feed";
import { PREP_UPDATE_FEED_SELECT, SUBMISSION_SELECT } from "./queries";
import type { FeedUpdate } from "@/components/progress/progress-feed";
import type { PaperWithRelations, SubmissionWithRelations } from "./types";

/** Merge recent papers and submissions into one chronological feed. */
export async function loadActivity(supabase: SupabaseClient, limit = 40): Promise<ActivityItem[]> {
  const [{ data: papers }, { data: subs }, { data: progress }] = await Promise.all([
    supabase
      .from("papers")
      .select("id, title, status, venue, created_at, updated_at, author:profiles!papers_user_id_fkey(id, username, full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("submissions").select(SUBMISSION_SELECT).order("created_at", { ascending: false }).limit(limit),
    // Empty if migration 003 hasn't been run yet.
    supabase.from("preparation_updates").select(PREP_UPDATE_FEED_SELECT).order("created_at", { ascending: false }).limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...((papers ?? []) as unknown as PaperWithRelations[]).map((p) => ({
      id: p.id,
      kind: (p.status === "Completed" ? "completed" : "paper") as ActivityItem["kind"],
      at: p.created_at,
      author: p.author,
      title: p.title,
      href: `/papers/${p.id}`,
      status: p.status,
      context: p.venue ?? undefined,
    })),
    ...((subs ?? []) as SubmissionWithRelations[]).map((s) => ({
      id: s.id,
      kind: "submission" as const,
      at: s.created_at,
      author: s.author,
      title: s.paper_title,
      href: `/venues/${s.venue_id}`,
      status: s.status,
      context: s.venue?.name,
    })),
    ...((progress ?? []) as unknown as FeedUpdate[])
      .filter((u) => u.preparation)
      .map((u) => ({
        id: u.id,
        kind: "progress" as const,
        at: u.created_at,
        author: u.preparation!.author,
        title: u.preparation!.title,
        href: `/progress/${u.preparation!.id}`,
        percent: u.progress,
        context: u.note ?? undefined,
      })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
