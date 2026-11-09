"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PaperCard } from "./paper-card";
import { PAPER_STATUSES, PAPER_TYPES } from "@/lib/constants";
import type { PaperWithRelations, ProfileLite, Topic } from "@/lib/types";

export interface PaperFilters {
  q: string;
  topic: string;
  type: string;
  year: string;
  status: string;
  member: string;
  sort: "newest" | "oldest" | "rating" | "title" | "year";
}

const DEFAULTS: PaperFilters = { q: "", topic: "all", type: "all", year: "all", status: "all", member: "all", sort: "newest" };

/**
 * Searchable / filterable grid of paper cards. Filtering is client-side
 * (a lab's paper log comfortably fits in memory) so it feels instant.
 */
export function PaperList({
  papers,
  topics,
  members,
  showAuthor = false,
  initial,
  emptyAction,
  emptyTitle = "No papers yet",
  emptyDescription = "Papers will appear here once they are logged.",
}: {
  papers: PaperWithRelations[];
  topics: Topic[];
  members?: ProfileLite[];
  showAuthor?: boolean;
  initial?: Partial<PaperFilters>;
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [f, setF] = useState<PaperFilters>({ ...DEFAULTS, ...initial });
  // Open the filter panel when the page is reached with a pre-set filter (e.g. ?topic=…).
  const [showFilters, setShowFilters] = useState(() =>
    Object.entries(initial ?? {}).some(([k, v]) => k !== "q" && k !== "sort" && v && v !== "all"),
  );
  const set = <K extends keyof PaperFilters>(k: K, v: PaperFilters[K]) => setF((s) => ({ ...s, [k]: v }));

  const years = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year).filter(Boolean) as number[])).sort((a, b) => b - a),
    [papers],
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = papers.filter((p) => {
      if (f.topic !== "all" && !p.topics.some((t) => t.id === f.topic)) return false;
      if (f.type !== "all" && p.paper_type !== f.type) return false;
      if (f.status !== "all" && p.status !== f.status) return false;
      if (f.year !== "all" && String(p.year) !== f.year) return false;
      if (f.member !== "all" && p.user_id !== f.member) return false;
      if (q) {
        const hay = [p.title, p.authors, p.venue, p.summary, p.notes, p.key_contributions, ...p.topics.map((t) => t.name)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorters: Record<PaperFilters["sort"], (a: PaperWithRelations, b: PaperWithRelations) => number> = {
      newest: (a, b) => (b.date_read ?? b.created_at).localeCompare(a.date_read ?? a.created_at),
      oldest: (a, b) => (a.date_read ?? a.created_at).localeCompare(b.date_read ?? b.created_at),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      title: (a, b) => a.title.localeCompare(b.title),
      year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
    };
    return out.sort(sorters[f.sort]);
  }, [papers, f]);

  const activeCount = (["topic", "type", "year", "status", "member"] as const).filter((k) => f[k] !== "all").length;

  if (!papers.length)
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} illustration="papers" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, authors, venue, notes, topics…"
            className="pl-9"
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            aria-label="Search papers"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
              <FilterSelect label="Topic" value={f.topic} onChange={(v) => set("topic", v)} options={topics.map((t) => ({ value: t.id, label: t.name }))} />
              <FilterSelect label="Type" value={f.type} onChange={(v) => set("type", v)} options={PAPER_TYPES.map((t) => ({ value: t, label: t }))} />
              <FilterSelect label="Status" value={f.status} onChange={(v) => set("status", v)} options={PAPER_STATUSES.map((t) => ({ value: t, label: t }))} />
              <FilterSelect label="Year" value={f.year} onChange={(v) => set("year", v)} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
              {members && (
                <FilterSelect label="Member" value={f.member} onChange={(v) => set("member", v)} options={members.map((m) => ({ value: m.id, label: m.full_name }))} />
              )}
              <Select value={f.sort} onValueChange={(v) => set("sort", v as PaperFilters["sort"])}>
                <SelectTrigger aria-label="Sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="year">Publication year</SelectItem>
                  <SelectItem value="title">Title A–Z</SelectItem>
                </SelectContent>
              </Select>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" className="col-span-full justify-self-start" onClick={() => setF({ ...DEFAULTS, q: f.q, sort: f.sort })}>
                  <X /> Clear filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {papers.length} paper{papers.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <EmptyState illustration="search" title="No matching papers" description="Try a different search or clear some filters." />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <PaperCard paper={p} showAuthor={showAuthor} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
