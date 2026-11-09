import Link from "next/link";
import {
  ArrowRight,
  Ban,
  BookPlus,
  CheckCircle2,
  Circle,
  Compass,
  FileText,
  KeyRound,
  Lightbulb,
  Tags,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Section title row used across the dashboard. */
export function SectionHeader({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {href && (
          <Link
            href={href}
            className="group inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-card px-3.5 text-xs font-semibold text-foreground/80 shadow-sm transition-all hover:border-primary/40 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

const QUICK: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/papers/new", label: "Log a paper", hint: "Novelty, gap, method, results", icon: BookPlus },
  { href: "/topics", label: "Research topics", hint: "Who reads what", icon: Tags },
  { href: "/progress", label: "Lab progress", hint: "Goals & updates", icon: Target },
  { href: "/explore", label: "Explore papers", hint: "Everything the lab read", icon: Compass },
];

/** Four big shortcuts to the things people do most. */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {QUICK.map((q) => (
        <Link
          key={q.href}
          href={q.href}
          className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-4"
        >
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <q.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{q.label}</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{q.hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

export interface ChecklistStep {
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

/** Onboarding checklist - shown until every step is done. */
export function GettingStarted({ steps }: { steps: ChecklistStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
        <span className="rounded-xl bg-forge p-2.5 text-white shadow-sm shadow-sky-500/30">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold">Get started</p>
          <p className="text-xs text-muted-foreground">
            {done} of {steps.length} done — your charts and the lab&apos;s topic pages fill up as you go.
          </p>
        </div>
        <span className="font-display text-2xl font-extrabold tabular-nums text-primary">{pct}%</span>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-forge transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="divide-y">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent sm:px-5", s.done && "opacity-60")}>
              {s.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", s.done && "line-through")}>{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
              </span>
              {!s.done && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Admin-only strip: lab size and anything waiting for the admin. */
export function AdminOverview({
  activeMembers,
  blocked,
  pendingResets,
  labPapers,
}: {
  activeMembers: number;
  blocked: number;
  pendingResets: number;
  labPapers: number;
}) {
  const items: { label: string; value: number; icon: LucideIcon; tone?: string; href: string }[] = [
    { label: "Active members", value: activeMembers, icon: Users, href: "/admin/users" },
    { label: "Lab papers", value: labPapers, icon: FileText, href: "/admin/papers" },
    {
      label: "Password requests",
      value: pendingResets,
      icon: KeyRound,
      href: "/admin/users",
      tone: pendingResets ? "border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : undefined,
    },
    { label: "Blocked", value: blocked, icon: Ban, href: "/admin/users" },
  ];
  return (
    <section aria-label="Admin overview">
      <SectionHeader title="Admin overview" description="Only admins see this" href="/admin" linkLabel="Admin panel" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 sm:p-4", it.tone)}
          >
            <it.icon className="h-5 w-5 shrink-0 opacity-70" />
            <span className="min-w-0">
              <span className="block font-display text-xl font-extrabold tabular-nums">{it.value}</span>
              <span className="block truncate text-xs opacity-75">{it.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export interface PulseTopic {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

/** What the whole lab has been reading in the last 30 days. */
export function LabPulse({ papers, readers, topics }: { papers: number; readers: number; topics: PulseTopic[] }) {
  const max = Math.max(1, ...topics.map((t) => t.count));
  return (
    <Card className="p-4 sm:p-5">
      <p className="font-display font-bold">Lab pulse</p>
      <p className="text-xs text-muted-foreground">Last 30 days, across everyone</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="font-display text-xl font-extrabold tabular-nums">{papers}</p>
          <p className="text-xs text-muted-foreground">papers logged</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="font-display text-xl font-extrabold tabular-nums">{readers}</p>
          <p className="text-xs text-muted-foreground">active readers</p>
        </div>
      </div>
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trending topics</p>
      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tagged papers this month yet.</p>
      ) : (
        <ul className="space-y-2">
          {topics.map((t) => (
            <li key={t.id}>
              <Link href={`/topics/${t.id}`} className="group block">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate group-hover:text-primary">{t.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{t.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${(t.count / max) * 100}%`, background: t.color ?? "hsl(var(--primary))" }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
