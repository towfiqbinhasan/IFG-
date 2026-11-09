import { PageHeader } from "@/components/shared/page-header";
import { MembersGrid, type MemberSummary } from "@/components/members/members-grid";
import { getSessionProfile } from "@/lib/session";
import { normalizePapers } from "@/lib/queries";
import type { Profile, Topic } from "@/lib/types";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const { supabase } = await getSessionProfile();
  const [{ data: profiles }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase
      .from("papers")
      .select("id, user_id, title, status, created_at, date_read, paper_topics(topics(*))")
      .order("created_at", { ascending: false }),
  ]);
  const papers = normalizePapers(rows);

  const summaries: MemberSummary[] = ((profiles ?? []) as Profile[]).map((profile) => {
    const mine = papers.filter((p) => p.user_id === profile.id);
    // "Current" topics: from papers being read now, else the most recent ones.
    const recent = mine.filter((p) => p.status === "Reading");
    const source = recent.length ? recent : mine.slice(0, 5);
    const topics = new Map<string, Topic>();
    source.forEach((p) => p.topics.forEach((t) => topics.set(t.id, t)));
    return {
      profile,
      total: mine.length,
      completed: mine.filter((p) => p.status === "Completed").length,
      currentTopics: Array.from(topics.values()).slice(0, 3),
      latest: mine[0] ? { id: mine[0].id, title: mine[0].title, at: mine[0].created_at } : null,
    };
  });

  return (
    <>
      <PageHeader title="Lab members" description={`${summaries.length} active members and what they're reading.`} />
      <MembersGrid members={summaries} />
    </>
  );
}
