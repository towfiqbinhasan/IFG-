"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Illustration = "papers" | "search" | "calendar" | "people" | "topics" | "activity";

/** Friendly empty state with a small inline SVG illustration. */
export function EmptyState({
  title,
  description,
  action,
  illustration = "papers",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  illustration?: Illustration;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center", className)}
    >
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <IllustrationSvg kind={illustration} />
      </motion.div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

function IllustrationSvg({ kind }: { kind: Illustration }) {
  const common = "h-24 w-24";
  // Hexagon backdrop echoing the logo frame.
  const bg = (
    <path
      d="M48 4 L86 26 L86 70 L48 92 L10 70 L10 26 Z"
      className="fill-primary/10 stroke-primary/25"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
  switch (kind) {
    case "search":
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <circle cx="42" cy="42" r="16" className="fill-background stroke-primary" strokeWidth="4" />
          <path d="M54 54l14 14" className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <rect x="24" y="28" width="48" height="42" rx="6" className="fill-background stroke-primary" strokeWidth="3" />
          <path d="M24 40h48" className="stroke-primary" strokeWidth="3" />
          <path d="M36 22v10M60 22v10" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
          <circle cx="48" cy="55" r="5" className="fill-primary" />
        </svg>
      );
    case "people":
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <circle cx="38" cy="40" r="9" className="fill-primary/70" />
          <circle cx="60" cy="40" r="9" className="fill-primary" />
          <path d="M22 70c2-12 10-17 16-17s14 5 16 17z" className="fill-primary/70" />
          <path d="M44 70c2-12 10-17 16-17s14 5 16 17z" className="fill-primary" />
        </svg>
      );
    case "topics":
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <rect x="22" y="30" width="30" height="12" rx="6" className="fill-primary" />
          <rect x="40" y="46" width="34" height="12" rx="6" className="fill-primary/70" />
          <rect x="26" y="62" width="24" height="12" rx="6" className="fill-primary/45" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <path d="M20 54h14l6-16 10 30 8-20h18" className="fill-none stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden>
          {bg}
          <rect x="30" y="20" width="36" height="50" rx="4" className="fill-background stroke-primary/50" strokeWidth="3" transform="rotate(-8 48 45)" />
          <rect x="30" y="24" width="36" height="50" rx="4" className="fill-background stroke-primary" strokeWidth="3" />
          <path d="M38 38h20M38 46h20M38 54h12" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}
