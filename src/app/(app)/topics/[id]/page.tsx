import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { TopicDetail } from "@/components/topics/topic-detail";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, PREP_SELECT, normalizePapers, normalizePreps } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("topics").select("name").eq("id", params.id).maybeSingle();
  return { title: data?.name ?? "Topic" };
}

/** One research topic: every paper the lab logged under it, who read it, and their analysis. */
export default async function TopicPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const { data: topic } = await supabase.from("topics").select("*").eq("id", params.id).maybeSingle();
  if (!topic) notFound();

  const { data: links } = await supabase.from("paper_topics").select("paper_id").eq("topic_id", params.id);
  const ids = (links ?? []).map((l) => l.paper_id as string);

  const [{ data: rows }, { data: prepRows }] = await Promise.all([
    ids.length
      ? supabase.from("papers").select(PAPER_SELECT).in("id", ids).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    // Empty if migration 003 hasn't been run yet.
    supabase.from("preparations").select(PREP_SELECT).eq("topic_id", params.id).neq("status", "Completed").order("progress", { ascending: false }),
  ]);

  const t = topic as Topic;
  return (
    <div className="space-y-6">
      <Link href="/topics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All topics
      </Link>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: t.color ?? "hsl(var(--primary))" }} />
            {t.name}
          </span>
        }
        description="Papers the lab has read on this topic — novelty, research gap, methodology and results, and who read what."
        actions={
          <Button variant="forge" asChild>
            <Link href={`/papers/new?topic=${t.id}`}>
              <Plus /> Add a paper to this topic
            </Link>
          </Button>
        }
      />
      <TopicDetail papers={normalizePapers(rows)} preps={normalizePreps(prepRows)} currentUserId={profile.id} topicId={t.id} />
    </div>
  );
}
