import { TopicsManager } from "@/components/admin/topics-manager";
import { requireAdmin } from "@/lib/session";
import type { Topic } from "@/lib/types";

export const metadata = { title: "Admin · Topics" };

export default async function AdminTopicsPage() {
  const { supabase, profile } = await requireAdmin();
  const [{ data: topics }, { data: links }] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase.from("paper_topics").select("topic_id"),
  ]);
  const counts: Record<string, number> = {};
  for (const l of links ?? []) counts[l.topic_id] = (counts[l.topic_id] ?? 0) + 1;
  return <TopicsManager topics={(topics ?? []) as Topic[]} counts={counts} userId={profile.id} />;
}
