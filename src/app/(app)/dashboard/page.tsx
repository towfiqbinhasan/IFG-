import Link from "next/link";
import { ArrowRight, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { HeroBanner } from "@/components/shared/hero-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { MemberStats } from "@/components/members/member-stats";
import { PaperCard } from "@/components/papers/paper-card";
import { DeadlineCard } from "@/components/venues/deadline-card";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, PREP_SELECT, PREP_UPDATE_FEED_SELECT, SUBMISSION_SELECT, isMissingTable, normalizePapers, normalizePreps } from "@/lib/queries";
import { PrepCard } from "@/components/progress/prep-card";
import { PrepFormDialog } from "@/components/progress/prep-form-dialog";
import { ProgressFeed, type FeedUpdate } from "@/components/progress/progress-feed";
import { upcomingDeadlines } from "@/lib/deadlines";
import type { SubmissionWithRelations, Topic, Venue } from "@/lib/types";
import { brand } from "@/config/brand";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: rows }, { data: venues }, { data: subs }, { data: prepRows, error: prepError }, { data: labUpdates }, { data: topics }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("venues").select("*"),
    supabase.from("submissions").select(SUBMISSION_SELECT).eq("user_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("preparations").select(PREP_SELECT).eq("user_id", profile.id).neq("status", "Completed").order("updated_at", { ascending: false }),
    supabase.from("preparation_updates").select(PREP_UPDATE_FEED_SELECT).order("created_at", { ascending: false }).limit(6),
    supabase.from("topics").select("id, name").order("name"),
  ]);
  const papers = normalizePapers(rows);
  const myPreps = normalizePreps(prepRows);
  const progressReady = !isMissingTable(prepError);

  // Unique venues ordered by their nearest upcoming submission deadline.
  const seen = new Set<string>();
  const upcoming = upcomingDeadlines((venues ?? []) as Venue[])
    .filter((e) => (seen.has(e.venue.id) ? false : (seen.add(e.venue.id), true)))
    .slice(0, 4);
  const submissions = (subs ?? []) as SubmissionWithRelations[];

  return (
    <div className="space-y-8">
      <HeroBanner
        eyebrow={profile.role === "admin" ? `${brand.appName} · Admin` : brand.appName}
        title={`${greeting()}, ${profile.full_name.split(" ")[0] || profile.username} 👋`}
        description="Your reading at a glance — papers, topics, streaks and the deadlines coming up."
        actions={
          <>
            {profile.role === "admin" && (
              <Button variant="outline" asChild className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                <Link href="/admin/users"><UserPlus /> Add member</Link>
              </Button>
            )}
            <Button asChild className="bg-white text-brand-navy shadow-lg hover:bg-sky-50">
              <Link href="/papers/new"><Plus /> Log paper</Link>
            </Button>
          </>
        }
      />

      <MemberStats papers={papers} />

      {progressReady && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">My preparations</h2>
              <div className="flex items-center gap-3">
                <PrepFormDialog
                  topics={(topics ?? []) as Pick<Topic, "id" | "name">[]}
                  userId={profile.id}
                  trigger={<Button size="sm" variant="outline"><Plus /> New</Button>}
                />
                <Link href="/progress" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Lab progress <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            {myPreps.length ? (
              <StaggerList className="grid gap-3 sm:grid-cols-2">
                {myPreps.slice(0, 4).map((p) => (
                  <StaggerItem key={p.id}><PrepCard prep={p} currentUserId={profile.id} showAuthor={false} /></StaggerItem>
                ))}
              </StaggerList>
            ) : (
              <EmptyState
                illustration="activity"
                title="Track what you're preparing"
                description="Add a goal — a topic to master, a paper to write, an exam — and post progress updates. The whole lab can follow along."
                action={
                  <PrepFormDialog
                    topics={(topics ?? []) as Pick<Topic, "id" | "name">[]}
                    userId={profile.id}
                    trigger={<Button variant="forge"><Plus /> New preparation</Button>}
                  />
                }
              />
            )}
          </section>
          <section>
            <Card>
              <CardHeader><CardTitle>Latest lab updates</CardTitle></CardHeader>
              <CardContent><ProgressFeed updates={(labUpdates ?? []) as unknown as FeedUpdate[]} compact /></CardContent>
            </Card>
          </section>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming deadlines</h2>
          <Link href="/venues" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            All deadlines <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {upcoming.length ? (
          <StaggerList className="grid gap-3 md:grid-cols-2">
            {upcoming.map((e) => <StaggerItem key={e.venue.id}><DeadlineCard venue={e.venue} /></StaggerItem>)}
          </StaggerList>
        ) : (
          <EmptyState illustration="calendar" title="No upcoming deadlines" description="Venues added to the tracker will show their countdown here." />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recently logged</h2>
            <Link href="/papers" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              My log <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {papers.length ? (
            <StaggerList className="grid gap-3 sm:grid-cols-2">
              {papers.slice(0, 4).map((p) => <StaggerItem key={p.id}><PaperCard paper={p} /></StaggerItem>)}
            </StaggerList>
          ) : (
            <EmptyState
              title="Start your reading log"
              description="Log your first paper to see stats and charts here."
              action={<Button asChild><Link href="/papers/new"><Plus /> Add paper</Link></Button>}
            />
          )}
        </section>

        <section>
          <Card className="border-border/60 shadow-sm backdrop-blur-md">
            <CardHeader><CardTitle className="text-base font-semibold">My submissions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submission plans yet. Open a venue and tap “I&apos;m planning to submit”.
                </p>
              ) : (
                submissions.map((s) => (
                  <Link key={s.id} href={`/venues/${s.venue_id}`} className="flex items-center gap-2 rounded-lg p-2.5 hover:bg-accent transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.paper_title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.venue?.name}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
