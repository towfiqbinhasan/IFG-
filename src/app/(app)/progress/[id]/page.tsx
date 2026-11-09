import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, CalendarPlus, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TopicChip } from "@/components/shared/topic-chip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ProgressBar } from "@/components/progress/progress-bar";
import { PrepTimeline } from "@/components/progress/prep-timeline";
import { PrepActions } from "@/components/progress/prep-actions";
import { targetLabel } from "@/lib/progress";
import { getSessionProfile } from "@/lib/session";
import { PREP_SELECT, normalizePreps } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export default async function PreparationPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: row }, { data: topics }] = await Promise.all([
    supabase.from("preparations").select(PREP_SELECT).eq("id", params.id).maybeSingle(),
    supabase.from("topics").select("id, name").order("name"),
  ]);
  if (!row) notFound();
  const [p] = normalizePreps([row]);
  const prep = p!;
  const isOwner = prep.user_id === profile.id;
  const target = targetLabel(prep.target_date, prep.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/progress" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lab progress
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={prep.status} />
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
            <Layers className="h-3 w-3" /> {prep.category}
          </span>
          {prep.topic && <TopicChip topic={prep.topic} href={`/topics?topic=${prep.topic.id}`} />}
        </div>
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{prep.title}</h1>
        {prep.author && (
          <Link href={`/members/${prep.author.username}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <UserAvatar name={prep.author.full_name} src={prep.author.avatar_url} className="h-7 w-7" />
            {prep.author.full_name}
          </Link>
        )}
        <PrepActions prep={prep} topics={(topics ?? []) as Pick<Topic, "id" | "name">[]} userId={profile.id} isOwner={isOwner} isAdmin={profile.role === "admin"} />
      </div>

      <Card className="overflow-hidden">
        <div className="hex-pattern bg-gradient-to-br from-sky-50 to-white p-5 dark:from-[#071633] dark:to-card sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</p>
          <ProgressBar value={prep.progress} size="lg" />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CalendarPlus className="h-4 w-4" /> Started {format(new Date(prep.created_at), "MMM d, yyyy")}</span>
            {target && <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> {target.text}</span>}
            <span>{prep.updates.length} update{prep.updates.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </Card>

      {prep.description && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">About</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed">{prep.description}</p></CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Timeline</h2>
        <PrepTimeline updates={prep.updates} />
      </section>
    </div>
  );
}
