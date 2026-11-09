"use client";

import type { TooltipProps } from "recharts";

/** Themed tooltip: values in text ink, a colour swatch carries identity. */
export function ChartTooltip({ active, payload, label, unit = "papers" }: TooltipProps<number, string> & { unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: (p.payload?.fill as string) ?? (p.color as string) }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {p.value} {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
