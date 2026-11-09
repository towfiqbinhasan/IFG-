"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Flame, Gauge, Search, Target } from "lucide-react";
import { subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { PrepCard } from "./prep-card";
import { PREP_STATUSES } from "@/lib/constants";
import type { PreparationWithRelations, ProfileLite, Topic } from "@/lib/types";

/** Lab-wide progress board: KPIs + filters + cards. */
export function PrepBoard({
  preps,
  topics,
  members,
  currentUserId,
  initialTopic,
  emptyAction,
}: {
  preps: PreparationWithRelations[];
  topics: Pick<Topic, "id" | "name">[];
  members: ProfileLite[];
  currentUserId: string;
  initialTopic?: string;
  emptyAction?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [member, setMember] = useState("all");
  const [topic, setTopic] = useState(initialTopic ?? "all");
  const [status, setStatus] = useState("open");
  const [sort, setSort] = useState("recent");

  const kpis = useMemo(() => {
    const active = preps.filter((p) => p.status === "Active");
    const weekAgo = subDays(new Date(), 7).toISOString();
    return {
      active: active.length,
      completed: preps.filter((p) => p.status === "Completed").length,
      avg: active.length ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0,
      week: preps.reduce((s, p) => s + p.updates.filter((u) => u.created_at >= weekAgo).length, 0),
    };
  }, [preps]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = preps.filter((p) => {
      if (member !== "all" && p.user_id !== member) return false;
      if (topic !== "all" && p.topic_id !== topic) return false;
      if (status === "open" && p.status === "Completed") return false;
      if (status !== "open" && status !== "all" && p.status !== status) return false;
      if (s && !`${p.title} ${p.description ?? ""} ${p.author?.full_name ?? ""} ${p.topic?.name ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
    const lastTouch = (p: PreparationWithRelations) => p.updates[0]?.created_at ?? p.updated_at;
    return out.sort((a, b) =>
      sort === "progress" ? b.progress - a.progress : sort === "target" ? (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999") : lastTouch(b).localeCompare(lastTouch(a)),
    );
  }, [preps, q, member, topic, status, sort]);

  return (
    <div className="space-y-5">
      <StaggerList className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StaggerItem><StatCard label="In progress" value={kpis.active} icon={Target} /></StaggerItem>
        <StaggerItem><StatCard label="Completed" value={kpis.completed} icon={CheckCircle2} /></StaggerItem>
        <StaggerItem><StatCard label="Avg. progress" value={kpis.avg} suffix="%" icon={Gauge} hint="Across active work" /></StaggerItem>
        <StaggerItem><StatCard label="Updates" value={kpis.week} icon={Flame} hint="In the last 7 days" /></StaggerItem>
      </StaggerList>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_repeat(4,auto)]">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search preparations, people, topics…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger className="lg:w-40" aria-label="Member"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            <SelectItem value={currentUserId}>Only me</SelectItem>
            {members.filter((m) => m.id !== currentUserId).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="lg:w-44" aria-label="Topic"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="lg:w-36" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Not completed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {PREP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="lg:w-40" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently updated</SelectItem>
            <SelectItem value="progress">Most progress</SelectItem>
            <SelectItem value="target">Nearest target</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          illustration="activity"
          title={preps.length ? "Nothing matches these filters" : "No preparations yet"}
          description={preps.length ? "Try “All statuses” or clear the filters." : "Add what you're working towards and post updates as you go — the whole lab can follow along."}
          action={preps.length ? undefined : emptyAction}
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }} exit={{ opacity: 0, scale: 0.96 }}>
                <PrepCard prep={p} currentUserId={currentUserId} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
