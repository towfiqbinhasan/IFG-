import { PageHeader } from "@/components/shared/page-header";
import { TopicsView } from "@/components/members/topics-view";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export const metadata = { title: "Topics" };

export default async function TopicsPage({ searchParams }: { searchParams: { topic?: string } }) {
  const { supabase } = await getSessionProfile();
  const [{ data: topics }, { data: rows }] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase.from("papers").select(PAPER_SELECT).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Research topics" description="What the lab is reading, and who is reading what." />
      <TopicsView topics={(topics ?? []) as Topic[]} papers={normalizePapers(rows)} initialTopic={searchParams.topic} />
    </>
  );
}
