"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";

/** Single-series column chart: papers read per month. */
export function PapersPerMonthChart({ data }: { data: { label: string; key: string; count: number }[] }) {
  return (
    <div className="h-60 w-full" role="img" aria-label="Papers read per month">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
            content={<ChartTooltip />}
            labelFormatter={(_, p) => (p?.[0]?.payload?.key as string) ?? ""}
          />
          <Bar dataKey="count" name="Papers" fill="var(--series-1)" radius={[4, 4, 0, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
