import Link from "next/link";
import { subDays } from "date-fns";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { MemberStats } from "@/components/members/member-stats";
import { PaperCard } from "@/components/papers/paper-card";
import { DeadlineCard } from "@/components/venues/deadline-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import {
  AdminOverview,
  GettingStarted,
  LabPulse,
  QuickActions,
  SectionHeader,
  type ChecklistStep,
  type PulseTopic,
} from "@/components/dashboard/dashboard-widgets";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, PREP_SELECT, PREP_UPDATE_FEED_SELECT, SUBMISSION_SELECT, isMissingTable, normalizePapers, normalizePreps } from "@/lib/queries";
import { PrepCard } from "@/components/progress/prep-card";
import { PrepFormDialog } from "@/components/progress/prep-form-dialog";
import { ProgressFeed, type FeedUpdate } from "@/components/progress/progress-feed";
import { upcomingDeadlines } from "@/lib/deadlines";
import { readingStreak } from "@/lib/stats";
import type { SubmissionWithRelations, Topic, Venue } from "@/lib/types";
import { brand } from "@/config/brand";

export const metadata = { title: "Dashboard" };

/** Greeting + date in the lab's time zone (the server runs in UTC). */
function localNow() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: brand.timeZone }).format(now));
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: brand.timeZone }).format(now);
  const greeting = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return { greeting, date };
}

type PulseRow = { user_id: string; paper_topics: { topics: Pick<Topic, "id" | "name" | "color"> | null }[] | null };

export default async function DashboardPage() {
  const { supabase, profile } = await getSessionProfile();
  const isAdmin = profile.role === "admin";
  const since = subDays(new Date(), 30).toISOString();

  const [
    { data: rows },
    { data: venues },
    { data: subs },
    { data: prepRows, error: prepError },
    { data: labUpdates },
    { data: topics },
    { data: pulseRows },
    adminData,
  ] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("venues").select("*"),
    supabase.from("submissions").select(SUBMISSION_SELECT).eq("user_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("preparations").select(PREP_SELECT).eq("user_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("preparation_updates").select(PREP_UPDATE_FEED_SELECT).order("created_at", { ascending: false }).limit(6),
    supabase.from("topics").select("id, name").order("name"),
    supabase.from("papers").select("user_id, paper_topics(topics(id, name, color))").gte("created_at", since),
    isAdmin
      ? Promise.all([
          supabase.from("profiles").select("is_active"),
          supabase.from("papers").select("id", { count: "exact", head: true }),
          supabase.from("password_reset_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ])
      : Promise.resolve(null),
  ]);

  const papers = normalizePapers(rows);
  const allPreps = normalizePreps(prepRows);
  const myPreps = allPreps.filter((p) => p.status !== "Completed");
  const progressReady = !isMissingTable(prepError);
  const submissions = (subs ?? []) as SubmissionWithRelations[];

  // Headline numbers.
  const completed = papers.filter((p) => p.status === "Completed").length;
  const reading = papers.filter((p) => p.status === "Reading").length;
  const streak = readingStreak(papers);
  const hours = Math.round(papers.reduce((s, p) => s + (p.time_spent_minutes ?? 0), 0) / 60);
  const thisMonth = papers.filter((p) => (p.date_read ?? p.created_at) >= since.slice(0, 10)).length;

  const { greeting, date } = localNow();
  const firstName = profile.full_name.split(" ")[0] || profile.username;
  const summary = !papers.length
    ? "Welcome to the lab tracker. Log your first paper to start building your reading history."
    : streak.current > 1
      ? `You're on a ${streak.current}-day reading streak — keep it going. ${reading ? `${reading} paper${reading === 1 ? "" : "s"} in progress.` : ""}`
      : `${thisMonth} paper${thisMonth === 1 ? "" : "s"} in the last 30 days${reading ? ` · ${reading} in progress` : ""}.`;

  // Onboarding checklist.
  const steps: ChecklistStep[] = [
    { label: "Log your first paper", hint: "Title, status and the date you read it", href: "/papers/new", done: papers.length > 0 },
    { label: "Tag it with a research topic", hint: "So the lab can see who reads what", href: papers[0] ? `/papers/${papers[0].id}/edit` : "/papers/new", done: papers.some((p) => p.topics.length > 0) },
    {
      label: "Write the novelty & research gap",
      hint: "Or upload your analysis as a PDF",
      href: papers[0] ? `/papers/${papers[0].id}/edit` : "/papers/new",
      done: papers.some((p) => p.novelty || p.research_gap || p.review_pdf_path),
    },
    ...(progressReady ? [{ label: "Start a preparation", hint: "A topic to master, a paper to write…", href: "/progress", done: allPreps.length > 0 }] : []),
    { label: "Add a profile photo", hint: "Helps the lab recognise you", href: "/profile", done: !!profile.avatar_url },
  ];
  const showChecklist = steps.some((s) => !s.done);

  // Lab pulse (last 30 days, everyone).
  const pulse = (pulseRows ?? []) as unknown as PulseRow[];
  const topicCounts = new Map<string, PulseTopic>();
  for (const r of pulse)
    for (const pt of r.paper_topics ?? []) {
      if (!pt.topics) continue;
      const t = topicCounts.get(pt.topics.id) ?? { ...pt.topics, count: 0 };
      t.count++;
      topicCounts.set(t.id, t);
    }
  const trending = Array.from(topicCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  // Deadlines: unique venues by nearest upcoming deadline.
  const seen = new Set<string>();
  const upcoming = upcomingDeadlines((venues ?? []) as Venue[])
    .filter((e) => (seen.has(e.venue.id) ? false : (seen.add(e.venue.id), true)))
    .slice(0, 3);

  const topicOptions = (topics ?? []) as Pick<Topic, "id" | "name">[];

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow={`${date}${isAdmin ? " · Admin" : ""}`}
        title={`${greeting}, ${firstName} 👋`}
        summary={summary}
        stats={{ completed, reading, streak: streak.current, bestStreak: streak.best, hours }}
        actions={
          <>
            {isAdmin && (
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

      <QuickActions />

      {isAdmin && adminData && (
        <AdminOverview
          activeMembers={(adminData[0].data ?? []).filter((p) => p.is_active).length}
          blocked={(adminData[0].data ?? []).filter((p) => !p.is_active).length}
          labPapers={adminData[1].count ?? 0}
          pendingResets={adminData[2].count ?? 0}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          {showChecklist && <GettingStarted steps={steps} />}

          {papers.length > 0 && (
            <section>
              <SectionHeader title="My reading" description="Your papers over time and by topic" href="/papers" linkLabel="My log" />
              <MemberStats papers={papers} chartsOnly />
            </section>
          )}

          {progressReady && (
            <section>
              <SectionHeader title="My preparations" description="Goals you're working towards" href="/progress" linkLabel="Lab progress">
                <PrepFormDialog topics={topicOptions} userId={profile.id} trigger={<Button size="sm" variant="outline"><Plus /> New</Button>} />
              </SectionHeader>
              {myPreps.length ? (
                <StaggerList className="grid gap-3 sm:grid-cols-2">
                  {myPreps.slice(0, 4).map((p) => (
                    <StaggerItem key={p.id}><PrepCard prep={p} currentUserId={profile.id} showAuthor={false} /></StaggerItem>
                  ))}
                </StaggerList>
              ) : (
                <EmptyState
                  illustration="activity"
                  className="py-8"
                  title="Track what you're preparing"
                  description="Add a goal — a topic to master, a paper to write, an exam — and post progress updates. The whole lab can follow along."
                  action={<PrepFormDialog topics={topicOptions} userId={profile.id} trigger={<Button variant="forge"><Plus /> New preparation</Button>} />}
                />
              )}
            </section>
          )}

          {papers.length > 0 && (
            <section>
              <SectionHeader title="Recently logged" href="/papers" linkLabel="All papers" />
              <StaggerList className="grid gap-3 sm:grid-cols-2">
                {papers.slice(0, 4).map((p) => <StaggerItem key={p.id}><PaperCard paper={p} /></StaggerItem>)}
              </StaggerList>
            </section>
          )}
        </div>

        {/* Side rail */}
        <aside className="min-w-0 space-y-6">
          <section>
            <SectionHeader title="Next deadlines" href="/venues" linkLabel="All" />
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((e) => <DeadlineCard key={e.venue.id} venue={e.venue} />)}
              </div>
            ) : (
              <Card className="p-5 text-sm text-muted-foreground">No upcoming deadlines. Venues added to the tracker show their countdown here.</Card>
            )}
          </section>

          <LabPulse papers={pulse.length} readers={new Set(pulse.map((r) => r.user_id)).size} topics={trending} />

          {progressReady && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Latest lab updates</CardTitle></CardHeader>
              <CardContent><ProgressFeed updates={(labUpdates ?? []) as unknown as FeedUpdate[]} compact /></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">My submissions</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submission plans yet. Open a <Link href="/venues" className="text-primary hover:underline">venue</Link> and tap “I&apos;m planning to submit”.
                </p>
              ) : (
                submissions.slice(0, 5).map((s) => (
                  <Link key={s.id} href={`/venues/${s.venue_id}`} className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent">
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
        </aside>
      </div>
    </div>
  );
}
