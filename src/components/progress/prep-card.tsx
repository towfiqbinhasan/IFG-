"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { CalendarClock, MessageSquareText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TopicChip } from "@/components/shared/topic-chip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ProgressBar } from "./progress-bar";
import { UpdateDialog } from "./update-dialog";
import { cn } from "@/lib/utils";
import { targetLabel } from "@/lib/progress";
import type { PreparationWithRelations } from "@/lib/types";

export function PrepCard({
  prep,
  currentUserId,
  showAuthor = true,
}: {
  prep: PreparationWithRelations;
  currentUserId: string;
  showAuthor?: boolean;
}) {
  const latest = prep.updates[0];
  const target = targetLabel(prep.target_date, prep.status);
  const isOwner = prep.user_id === currentUserId;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.15 }} className="h-full">
      <Card className="group relative flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{prep.category}</p>
            <Link href={`/progress/${prep.id}`} className="after:absolute after:inset-0">
              <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug group-hover:text-primary">{prep.title}</h3>
            </Link>
          </div>
          <StatusBadge status={prep.status} className="shrink-0" />
        </div>

        <ProgressBar value={prep.progress} />

        {latest && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            <MessageSquareText className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {latest.note || `Moved to ${latest.progress}%`}
            <span className="ml-1 text-xs">· {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}</span>
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          {prep.topic && <span className="relative z-10"><TopicChip topic={prep.topic} href={`/topics?topic=${prep.topic.id}`} /></span>}
          {target && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                target.tone === "bad" && "font-medium text-rose-600 dark:text-rose-400",
                target.tone === "warn" && "font-medium text-amber-600 dark:text-amber-400",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" /> {target.text}
            </span>
          )}
          <span className="ml-auto">{prep.updates.length} update{prep.updates.length === 1 ? "" : "s"}</span>
        </div>

        {(showAuthor || isOwner) && (
          <div className="relative z-10 flex items-center gap-2 border-t pt-3">
            {showAuthor && prep.author && (
              <Link href={`/members/${prep.author.username}`} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <UserAvatar name={prep.author.full_name} src={prep.author.avatar_url} className="h-6 w-6 text-[10px]" />
                <span className="truncate">{prep.author.full_name}</span>
              </Link>
            )}
            {isOwner && prep.status !== "Completed" && (
              <UpdateDialog
                prepId={prep.id}
                prepTitle={prep.title}
                current={prep.progress}
                userId={currentUserId}
                trigger={
                  <Button size="sm" variant="outline" className="ml-auto h-8">
                    <TrendingUp /> Update
                  </Button>
                }
              />
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
