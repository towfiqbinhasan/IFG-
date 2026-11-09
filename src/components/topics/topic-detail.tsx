"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Paperclip, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/progress/progress-bar";
import { PdfButton } from "@/components/papers/paper-actions";
import { cn } from "@/lib/utils";
import type { PaperWithRelations, PreparationWithRelations, ProfileLite } from "@/lib/types";

type Reader = { author: ProfileLite; total: number; reading: number; completed: number };

const ANALYSIS = [
  { key: "novelty", label: "Novelty" },
  { key: "research_gap", label: "Research gap" },
  { key: "methodology", label: "Methodology" },
  { key: "results", label: "Results" },
] as const;

export function TopicDetail({
  papers,
  preps,
  currentUserId,
  topicId,
}: {
  papers: PaperWithRelations[];
  preps: PreparationWithRelations[];
  currentUserId: string;
  topicId: string;
}) {
  const [member, setMember] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const readers = useMemo(() => {
    const m = new Map<string, Reader>();
    for (const p of papers) {
      if (!p.author) continue;
      const r = m.get(p.author.id) ?? { author: p.author, total: 0, reading: 0, completed: 0 };
      r.total++;
      if (p.status === "Reading") r.reading++;
      if (p.status === "Completed") r.completed++;
      m.set(p.author.id, r);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total || a.author.full_name.localeCompare(b.author.full_name));
  }, [papers]);

  const shown = papers.filter((p) => {
    if (member && p.author?.id !== member) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [p.title, p.authors, p.venue, p.novelty, p.research_gap, p.methodology, p.results, p.author?.full_name]
      .some((v) => v?.toLowerCase().includes(s));
  });

  if (!papers.length && !preps.length) {
    return (
      <EmptyState
        illustration="topics"
        title="No papers on this topic yet"
        description="Be the first: add a paper you read and write (or upload) its novelty, research gap, methodology and results."
        action={
          <Button variant="forge" asChild>
            <Link href={`/papers/new?topic=${topicId}`}>Add a paper</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search papers, methods, results…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {member && (
            <Button variant="ghost" size="sm" onClick={() => setMember(null)}>
              Show everyone
            </Button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No papers match.</p>
        ) : (
          shown.map((p, i) => <PaperAnalysisCard key={p.id} paper={p} index={i} mine={p.user_id === currentUserId} />)
        )}
      </div>

      <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Who&apos;s reading this topic
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {papers.length} paper{papers.length === 1 ? "" : "s"} · {readers.length} member{readers.length === 1 ? "" : "s"} · tap a name to filter
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {readers.length === 0 && <p className="text-sm text-muted-foreground">Nobody has logged a paper here yet.</p>}
            {readers.map((r) => (
              <button
                key={r.author.id}
                onClick={() => setMember(member === r.author.id ? null : r.author.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent",
                  member === r.author.id && "bg-accent ring-1 ring-primary/40",
                )}
              >
                <UserAvatar name={r.author.full_name} src={r.author.avatar_url} className="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.author.full_name}
                    {r.author.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.total} paper{r.total === 1 ? "" : "s"}
                    {r.reading > 0 && ` · ${r.reading} reading`}
                    {r.completed > 0 && ` · ${r.completed} done`}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {preps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Studying this topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {preps.map((x) => (
                <Link key={x.id} href={`/progress/${x.id}`} className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                  <UserAvatar name={x.author?.full_name} src={x.author?.avatar_url} className="h-6 w-6 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{x.author?.full_name}</span>
                      <span className="text-muted-foreground"> · {x.title}</span>
                    </p>
                    <ProgressBar value={x.progress} size="sm" className="mt-1" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function PaperAnalysisCard({ paper: p, index, mine }: { paper: PaperWithRelations; index: number; mine: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const filled = ANALYSIS.filter((a) => p[a.key]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 10) * 0.04 } }}>
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Link href={`/papers/${p.id}`} className="font-semibold leading-snug hover:text-primary">
                {p.title}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{[p.authors, p.venue, p.year].filter(Boolean).join(" · ")}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>

          {p.author && (
            <Link href={`/members/${p.author.username}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <UserAvatar name={p.author.full_name} src={p.author.avatar_url} className="h-5 w-5 text-[9px]" />
              Read by <span className="font-medium text-foreground">{p.author.full_name}</span>
            </Link>
          )}

          {filled.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filled.map((a) => (
                <div key={a.key} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{a.label}</p>
                  <p className={cn("mt-1 whitespace-pre-wrap text-sm leading-relaxed", !expanded && "line-clamp-4")}>{p[a.key]}</p>
                </div>
              ))}
            </div>
          ) : (
            !p.review_pdf_path && (
              <p className="text-sm text-muted-foreground">
                No analysis written yet.
                {mine && (
                  <>
                    {" "}
                    <Link href={`/papers/${p.id}/edit`} className="text-primary hover:underline">Add yours</Link>
                  </>
                )}
              </p>
            )
          )}

          <div className="flex flex-wrap items-center gap-2">
            {p.review_pdf_path && <PdfButton path={p.review_pdf_path} label="Analysis PDF" />}
            {p.pdf_path && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> Paper PDF attached
              </span>
            )}
            <span className="flex-1" />
            {filled.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Show less" : "Show more"}
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/papers/${p.id}`}>
                Full notes <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
