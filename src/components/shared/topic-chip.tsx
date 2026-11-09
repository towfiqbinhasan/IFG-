import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/types";

export function TopicChip({ topic, href, className }: { topic: Pick<Topic, "id" | "name" | "color">; href?: string; className?: string }) {
  const content = (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/80",
        href && "transition-colors hover:bg-accent",
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: topic.color ?? "hsl(var(--primary))" }} />
      <span className="truncate">{topic.name}</span>
    </span>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
