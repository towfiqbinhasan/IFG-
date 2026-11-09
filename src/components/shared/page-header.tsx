import { cn } from "@/lib/utils";

/** Page title block used on every app page, with the brand gradient accent. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-2 flex items-center gap-1.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-forge" />
          <span className="h-1 w-2 rounded-full bg-[var(--brand-cyan)] opacity-60" />
          <span className="h-1 w-1 rounded-full bg-[var(--brand-cyan)] opacity-40" />
        </div>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
