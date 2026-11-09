import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, BookOpenCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TopicChip } from "@/components/shared/topic-chip";
import { Rating } from "@/components/shared/rating";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { PaperOwnerActions, PdfButton } from "@/components/papers/paper-actions";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";
import { readMethodLabel } from "@/lib/constants";
import { doiHref, formatMinutes } from "@/lib/utils";

export default async function PaperDetailPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const { data: row } = await supabase.from("papers").select(PAPER_SELECT).eq("id", params.id).maybeSingle();
  if (!row) notFound();
  const [paper] = normalizePapers([row]);
  const p = paper!;
  const isOwner = p.user_id === profile.id;
  const canDelete = isOwner || profile.role === "admin";
  const link = doiHref(p.doi_url);

  const sections = [
    { title: "Summary", body: p.summary },
    { title: "Key contributions", body: p.key_contributions },
    { title: "Methodology", body: p.methodology },
    { title: "Results", body: p.results },
    { title: "Limitations", body: p.limitations },
    { title: "My notes", body: p.notes },
  ].filter((s) => s.body);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={isOwner ? "/papers" : "/explore"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
            <FileText className="h-3 w-3" /> {p.paper_type}
          </span>
          {p.rating ? <Rating value={p.rating} size={14} /> : null}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{p.title}</h1>
        <p className="text-muted-foreground">{[p.authors, p.venue, p.year].filter(Boolean).join(" · ")}</p>
        {p.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.topics.map((t) => <TopicChip key={t.id} topic={t} href={`/topics?topic=${t.id}`} />)}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {link && (
            <Button variant="outline" asChild>
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open paper
              </a>
            </Button>
          )}
          {p.pdf_path && <PdfButton path={p.pdf_path} />}
          {canDelete && <PaperOwnerActions id={p.id} pdfPath={p.pdf_path} canEdit={isOwner} />}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <Meta icon={CalendarDays} label="Date read" value={p.date_read ? format(new Date(p.date_read), "MMM d, yyyy") : "—"} />
          <Meta icon={BookOpenCheck} label="How read" value={readMethodLabel(p.read_method)} />
          <Meta icon={Clock} label="Time spent" value={formatMinutes(p.time_spent_minutes)} />
          {p.author && (
            <Link href={`/members/${p.author.username}`} className="flex items-center gap-2">
              <UserAvatar name={p.author.full_name} src={p.author.avatar_url} className="h-8 w-8" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Logged by</p>
                <p className="truncate text-sm font-medium hover:text-primary">{p.author.full_name}</p>
              </div>
            </Link>
          )}
        </CardContent>
      </Card>

      {sections.length ? (
        <StaggerList className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <StaggerItem key={s.title} className={s.title === "Summary" || s.title === "My notes" ? "md:col-span-2" : ""}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No notes written for this paper yet.</p>
      )}

      <p className="text-xs text-muted-foreground">
        Added {format(new Date(p.created_at), "PPp")} · Updated {format(new Date(p.updated_at), "PPp")}
      </p>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
