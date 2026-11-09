"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ProgressBar } from "./progress-bar";
import type { PreparationUpdate, ProfileLite, Topic } from "@/lib/types";

export interface FeedUpdate extends PreparationUpdate {
  preparation: {
    id: string;
    title: string;
    progress: number;
    author: ProfileLite | null;
    topic: Pick<Topic, "id" | "name" | "color"> | null;
  } | null;
}

/** Compact list of the latest progress updates across the lab. */
export function ProgressFeed({ updates, compact = false }: { updates: FeedUpdate[]; compact?: boolean }) {
  const items = updates.filter((u) => u.preparation);
  if (!items.length) return <p className="text-sm text-muted-foreground">No progress updates yet.</p>;
  return (
    <ul className="space-y-3">
      {items.map((u, i) => {
        const p = u.preparation!;
        return (
          <motion.li key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}>
            <Link href={`/progress/${p.id}`} className="flex gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent">
              <UserAvatar name={p.author?.full_name} src={p.author?.avatar_url} className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium">{p.author?.full_name ?? "Someone"}</span>{" "}
                  <span className="text-muted-foreground">→ {u.progress}%</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{p.title}</p>
                {!compact && u.note && <p className="mt-0.5 line-clamp-2 text-xs">{u.note}</p>}
                <ProgressBar value={u.progress} size="sm" showLabel={false} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</p>
              </div>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
