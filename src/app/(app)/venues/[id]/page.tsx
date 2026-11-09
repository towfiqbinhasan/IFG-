import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, MapPin, Pencil, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { Countdown } from "@/components/venues/countdown";
import { SubmissionDialog } from "@/components/venues/submission-dialog";
import { VenueManageActions } from "@/components/venues/venue-admin-actions";
import { getSessionProfile } from "@/lib/session";
import { SUBMISSION_SELECT } from "@/lib/queries";
import { DEADLINE_FIELDS } from "@/lib/constants";
import { doiHref } from "@/lib/utils";
import type { SubmissionWithRelations, Venue } from "@/lib/types";

export default async function VenueDetailPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: venueRow }, { data: subRows }] = await Promise.all([
    supabase.from("venues").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("submissions").select(SUBMISSION_SELECT).eq("venue_id", params.id).order("created_at"),
  ]);
  if (!venueRow) notFound();
  const venue = venueRow as Venue;
  const submissions = (subRows ?? []) as SubmissionWithRelations[];
  const mine = submissions.filter((s) => s.user_id === profile.id);
  const canManage = profile.role === "admin" || venue.created_by === profile.id;
  const site = doiHref(venue.website);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/venues" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All deadlines
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{venue.type}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{venue.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {venue.field && <span>{venue.field}</span>}
            {venue.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{venue.location}</span>
            )}
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Website
              </a>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmissionDialog venueId={venue.id} userId={profile.id} trigger={<Button><Target /> I&apos;m planning to submit</Button>} />
          {canManage && <VenueManageActions venue={venue} userId={profile.id} redirectTo="/venues" />}
        </div>
      </div>

      <StaggerList className="grid gap-3 sm:grid-cols-2">
        {DEADLINE_FIELDS.map((f) => {
          const d = venue[f.key];
          return (
            <StaggerItem key={f.key}>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</p>
                {d ? (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{format(new Date(d), "EEE, MMM d yyyy · HH:mm")}</p>
                    <Countdown date={d} />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Not set</p>
                )}
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {venue.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{venue.notes}</p></CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Lab submissions ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <EmptyState illustration="people" title="No one has marked this venue yet" description="Planning to submit? Let the lab know." />
        ) : (
          <StaggerList className="space-y-2">
            {submissions.map((s) => (
              <StaggerItem key={s.id}>
                <Card className="flex items-center gap-3 p-3">
                  <UserAvatar name={s.author?.full_name} src={s.author?.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.paper_title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.author ? <Link href={`/members/${s.author.username}`} className="hover:underline">{s.author.full_name}</Link> : "Unknown"}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                  {(s.user_id === profile.id || profile.role === "admin") && (
                    <SubmissionDialog
                      venueId={venue.id}
                      userId={profile.id}
                      submission={s}
                      trigger={<Button variant="ghost" size="icon" aria-label="Edit submission"><Pencil /></Button>}
                    />
                  )}
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
        {mine.length > 0 && <p className="mt-2 text-xs text-muted-foreground">You have {mine.length} submission plan(s) here.</p>}
      </section>
    </div>
  );
}
