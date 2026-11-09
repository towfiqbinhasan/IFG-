"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";

/** Ranked horizontal bars (one series), e.g. papers by type or by member. */
export function HorizontalBarChart({
  data,
  unit = "papers",
  color = "var(--series-1)",
}: {
  data: { name: string; value: number }[];
  unit?: string;
  color?: string;
}) {
  const height = Math.max(160, data.length * 34 + 20);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey="value" name="Count" fill={color} radius={[0, 4, 4, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
