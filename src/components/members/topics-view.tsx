"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChartCard } from "@/components/charts/chart-card";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { cn } from "@/lib/utils";
import type { PaperWithRelations, PreparationWithRelations, Topic } from "@/lib/types";
import { ProgressBar } from "@/components/progress/progress-bar";

/** Topics with paper counts, who is reading what, and an expandable paper list. */
export function TopicsView({
  topics,
  papers,
  preps = [],
  initialTopic,
}: {
  topics: Topic[];
  papers: PaperWithRelations[];
  /** Preparations linked to topics (progress on each topic). */
  preps?: PreparationWithRelations[];
  initialTopic?: string;
}) {
  const [open, setOpen] = useState<string | null>(initialTopic ?? null);
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      topics
        .map((t) => {
          const ps = papers.filter((p) => p.topics.some((x) => x.id === t.id));
          const readers = new Map<string, NonNullable<PaperWithRelations["author"]>>();
          ps.forEach((p) => p.author && readers.set(p.author.id, p.author));
          return { topic: t, papers: ps, readers: Array.from(readers.values()), preps: preps.filter((x) => x.topic_id === t.id) };
        })
        .sort((a, b) => b.papers.length - a.papers.length || a.topic.name.localeCompare(b.topic.name)),
    [topics, papers, preps],
  );

  const shown = rows.filter((r) => !q || r.topic.name.toLowerCase().includes(q.toLowerCase()));
  const chart = rows.filter((r) => r.papers.length).slice(0, 10).map((r) => ({ name: r.topic.name, value: r.papers.length }));

  if (!topics.length) return <EmptyState illustration="topics" title="No topics yet" description="Topics are created when members tag their papers." />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filter topics" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {shown.map((r, i) => {
          const isOpen = open === r.topic.id;
          return (
            <motion.div key={r.topic.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }}>
              <Card className={cn("overflow-hidden transition-shadow", isOpen && "shadow-md ring-1 ring-primary/30")}>
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : r.topic.id)} aria-expanded={isOpen}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.topic.color ?? "hsl(var(--primary))" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.topic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.papers.length} paper{r.papers.length === 1 ? "" : "s"} · {r.readers.length} reader{r.readers.length === 1 ? "" : "s"}
                      {r.preps.length > 0 && ` · ${r.preps.length} in progress`}
                    </p>
                  </div>
                  <div className="hidden -space-x-2 sm:flex">
                    {r.readers.slice(0, 4).map((a) => <UserAvatar key={a.id} name={a.full_name} src={a.avatar_url} className="h-7 w-7 border-2 border-card text-[10px]" />)}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="space-y-3 border-t p-4">
                        {r.preps.length > 0 && (
                          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who&apos;s working on it</p>
                            {r.preps.map((x) => (
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
                          </div>
                        )}
                        {r.readers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {r.readers.map((a) => (
                              <Link key={a.id} href={`/members/${a.username}`} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs hover:bg-accent">
                                <UserAvatar name={a.full_name} src={a.avatar_url} className="h-5 w-5 text-[9px]" /> {a.full_name}
                              </Link>
                            ))}
                          </div>
                        )}
                        {r.papers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No papers tagged with this topic yet.</p>
                        ) : (
                          <ul className="divide-y">
                            {r.papers.slice(0, 15).map((p) => (
                              <li key={p.id}>
                                <Link href={`/papers/${p.id}`} className="flex items-center gap-2 py-2 hover:text-primary">
                                  <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                                  <span className="hidden text-xs text-muted-foreground sm:inline">{p.author?.full_name}</span>
                                  <StatusBadge status={p.status} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {r.papers.length > 15 && (
                          <Link href={`/explore?topic=${r.topic.id}`} className="text-sm text-primary hover:underline">View all {r.papers.length} in explorer →</Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">
        <ChartCard title="Most-read topics" description="Top 10 by number of papers" empty={!chart.length}>
          <HorizontalBarChart data={chart} />
        </ChartCard>
      </div>
    </div>
  );
}
