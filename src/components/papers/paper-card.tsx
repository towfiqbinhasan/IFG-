"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TopicChip } from "@/components/shared/topic-chip";
import { Rating } from "@/components/shared/rating";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { PaperWithRelations } from "@/lib/types";

export function PaperCard({ paper, showAuthor = false }: { paper: PaperWithRelations; showAuthor?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      className="h-full"
    >
      <Card className="group relative flex h-full flex-col gap-3 rounded-2xl border-border/60 bg-gradient-to-b from-card/90 to-card/60 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/papers/${paper.id}`} className="after:absolute after:inset-0">
              <h3 className="line-clamp-2 font-semibold text-base leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                {paper.title}
              </h3>
            </Link>
            <p className="mt-1 line-clamp-1 text-xs font-medium text-muted-foreground/80">
              {[paper.authors, paper.venue, paper.year].filter(Boolean).join(" · ") || "No bibliographic details"}
            </p>
          </div>
          <StatusBadge status={paper.status} className="shrink-0" />
        </div>

        {paper.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground/90 leading-relaxed font-normal">
            {paper.summary}
          </p>
        )}

        {paper.topics.length > 0 && (
          <div className="relative z-10 flex flex-wrap gap-1.5 pt-1">
            {paper.topics.slice(0, 4).map((t) => (
              <TopicChip key={t.id} topic={t} href={`/topics?topic=${t.id}`} />
            ))}
            {paper.topics.length > 4 && (
              <span className="text-xs text-muted-foreground font-medium self-center">
                +{paper.topics.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-0.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            {paper.paper_type}
          </span>
          {paper.date_read && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(paper.date_read), "MMM d, yyyy")}
            </span>
          )}
          {paper.pdf_path && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Paperclip className="h-3.5 w-3.5" aria-label="PDF attached" /> PDF
            </span>
          )}
          <span className="flex-1" />
          {paper.rating ? <Rating value={paper.rating} size={13} /> : null}
        </div>

        {showAuthor && paper.author && (
          <Link
            href={`/members/${paper.author.username}`}
            className="relative z-10 flex items-center gap-2 border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserAvatar name={paper.author.full_name} src={paper.author.avatar_url} className="h-6 w-6 text-[10px]" />
            {paper.author.full_name}
          </Link>
        )}
      </Card>
    </motion.div>
  );
}
