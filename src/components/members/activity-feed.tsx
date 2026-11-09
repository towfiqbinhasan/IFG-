"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { BookPlus, CheckCircle2, Target } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { ProfileLite } from "@/lib/types";

export interface ActivityItem {
  id: string;
  kind: "paper" | "completed" | "submission";
  at: string;
  author: ProfileLite | null;
  title: string;
  href: string;
  status?: string;
  context?: string;
}

const ICON = { paper: BookPlus, completed: CheckCircle2, submission: Target };
const VERB = { paper: "logged", completed: "finished reading", submission: "plans to submit" };

/** Vertical timeline of recent lab activity. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <EmptyState illustration="activity" title="No activity yet" description="New papers and submission plans show up here." />;
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {items.map((it, i) => {
        const Icon = ICON[it.kind];
        return (
          <motion.li
            key={`${it.kind}-${it.id}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i, 15) * 0.035 } }}
            className="relative"
          >
            <span className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <UserAvatar name={it.author?.full_name} src={it.author?.avatar_url} className="h-8 w-8" />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  {it.author ? (
                    <Link href={`/members/${it.author.username}`} className="font-medium hover:underline">{it.author.full_name}</Link>
                  ) : (
                    "Someone"
                  )}{" "}
                  <span className="text-muted-foreground">{VERB[it.kind]}</span>{" "}
                  <Link href={it.href} className="font-medium hover:text-primary">{it.title}</Link>
                  {it.context && <span className="text-muted-foreground"> · {it.context}</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(it.at), { addSuffix: true })}</p>
              </div>
              {it.status && <StatusBadge status={it.status} className="hidden sm:inline-flex" />}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
