"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Search, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TopicChip } from "@/components/shared/topic-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { staggerContainer, staggerItem } from "@/components/shared/motion";
import type { Profile, Topic } from "@/lib/types";

export interface MemberSummary {
  profile: Profile;
  total: number;
  completed: number;
  currentTopics: Topic[];
  latest: { title: string; at: string; id: string } | null;
}

export function MembersGrid({ members }: { members: MemberSummary[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter(
      (m) => !s || `${m.profile.full_name} ${m.profile.username} ${m.profile.research_area ?? ""}`.toLowerCase().includes(s),
    );
  }, [members, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search members or research areas" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <EmptyState illustration="people" title="No members found" />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <motion.div key={m.profile.id} variants={staggerItem} whileHover={{ y: -3 }}>
              <Card className="relative flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <UserAvatar name={m.profile.full_name} src={m.profile.avatar_url} className="h-12 w-12" />
                  <div className="min-w-0">
                    <Link href={`/members/${m.profile.username}`} className="after:absolute after:inset-0">
                      <h3 className="flex items-center gap-1.5 truncate font-semibold hover:text-primary">
                        {m.profile.full_name}
                        {m.profile.role === "admin" && <Shield className="h-3.5 w-3.5 text-primary" aria-label="Admin" />}
                      </h3>
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{m.profile.research_area || `@${m.profile.username}`}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 py-2">
                    <p className="text-lg font-semibold tabular-nums">{m.completed}</p>
                    <p className="text-[11px] text-muted-foreground">read</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 py-2">
                    <p className="text-lg font-semibold tabular-nums">{m.total}</p>
                    <p className="text-[11px] text-muted-foreground">logged</p>
                  </div>
                </div>
                {m.currentTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.currentTopics.map((t) => <TopicChip key={t.id} topic={t} />)}
                  </div>
                )}
                <p className="mt-auto truncate text-xs text-muted-foreground">
                  {m.latest ? <>Latest: “{m.latest.title}” · {formatDistanceToNow(new Date(m.latest.at), { addSuffix: true })}</> : "No activity yet"}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
