import { PageHeader } from "@/components/shared/page-header";
import { TopicsView } from "@/components/members/topics-view";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, PREP_SELECT, normalizePapers, normalizePreps } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export const metadata = { title: "Topics" };

export default async function TopicsPage({ searchParams }: { searchParams: { topic?: string } }) {
  const { supabase } = await getSessionProfile();
  const [{ data: topics }, { data: rows }, { data: prepRows }] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase.from("papers").select(PAPER_SELECT).order("created_at", { ascending: false }),
    // Empty if migration 003 hasn't been run yet.
    supabase.from("preparations").select(PREP_SELECT).not("topic_id", "is", null).neq("status", "Completed").order("progress", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Research topics" description="What the lab is reading, and who is reading what." />
      <TopicsView topics={(topics ?? []) as Topic[]} papers={normalizePapers(rows)} preps={normalizePreps(prepRows)} initialTopic={searchParams.topic} />
    </>
  );
}
