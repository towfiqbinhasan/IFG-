import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus, Sparkles, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { MemberStats } from "@/components/members/member-stats";
import { PaperCard } from "@/components/papers/paper-card";
import { DeadlineCard } from "@/components/venues/deadline-card";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, SUBMISSION_SELECT, normalizePapers } from "@/lib/queries";
import { upcomingDeadlines } from "@/lib/deadlines";
import type { SubmissionWithRelations, Venue } from "@/lib/types";
import { brand } from "@/config/brand";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: rows }, { data: venues }, { data: subs }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("venues").select("*"),
    supabase.from("submissions").select(SUBMISSION_SELECT).eq("user_id", profile.id).order("updated_at", { ascending: false }),
  ]);
  const papers = normalizePapers(rows);

  // Unique venues ordered by their nearest upcoming submission deadline.
  const seen = new Set<string>();
  const upcoming = upcomingDeadlines((venues ?? []) as Venue[])
    .filter((e) => (seen.has(e.venue.id) ? false : (seen.add(e.venue.id), true)))
    .slice(0, 4);
  const submissions = (subs ?? []) as SubmissionWithRelations[];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/20 bg-background/80 p-1 shadow-md">
              <Image
                src={brand.logoSrc}
                alt={brand.appName}
                fill
                sizes="64px"
                className="object-contain rounded-xl"
                priority
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> {brand.appName}
                </span>
                {profile.role === "admin" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting()}, {profile.full_name.split(" ")[0] || profile.username}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your research overview &amp; reading tracker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.role === "admin" && (
              <Button variant="outline" className="border-primary/30 hover:bg-primary/10" asChild>
                <Link href="/admin/users">
                  <UserPlus className="mr-1.5 h-4 w-4" /> Add Member
                </Link>
              </Button>
            )}
            <Button asChild className="shadow-md">
              <Link href="/papers/new"><Plus className="mr-1.5 h-4 w-4" /> Log Paper</Link>
            </Button>
          </div>
        </div>
      </div>

      <MemberStats papers={papers} />

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
