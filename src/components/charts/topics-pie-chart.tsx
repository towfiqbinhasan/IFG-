"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { SERIES_VARS } from "@/lib/constants";

/**
 * Donut of topic share. Colours are assigned by slot in fixed order; the
 * caller folds long tails into "Other" (see topicCounts) so slices <= 6.
 * A legend with counts is always shown, so identity never relies on colour.
 */
export function TopicsPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colored = data.map((d, i) => ({
    ...d,
    fill: d.name === "Other" ? "hsl(var(--muted-foreground) / 0.5)" : SERIES_VARS[i % SERIES_VARS.length],
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0" role="img" aria-label="Topics share">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={colored}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--chart-surface)"
              strokeWidth={2}
              animationDuration={900}
            >
              {colored.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">tagged</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {colored.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: d.fill }} />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
