"use client";

import { useMemo } from "react";
import { BookCheck, CalendarClock, Library, Send, Tags, Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { ChartCard } from "@/components/charts/chart-card";
import { PapersPerMonthChart } from "@/components/charts/papers-per-month-chart";
import { TopicsPieChart } from "@/components/charts/topics-pie-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { countBy, papersPerMonth, topicCounts } from "@/lib/stats";
import type { PaperWithRelations } from "@/lib/types";

/** Lab-wide KPI counters and charts (Lab Stats page + admin overview). */
export function LabStats({
  papers,
  memberCount,
  topicCount,
  upcomingVenues,
  submissionCount,
}: {
  papers: PaperWithRelations[];
  memberCount: number;
  topicCount: number;
  upcomingVenues: number;
  submissionCount: number;
}) {
  const d = useMemo(
    () => ({
      completed: papers.filter((p) => p.status === "Completed").length,
      monthly: papersPerMonth(papers),
      topics: topicCounts(papers),
      types: countBy(papers, (p) => p.paper_type),
      readers: countBy(papers.filter((p) => p.status === "Completed"), (p) => p.author?.full_name).slice(0, 8),
      statuses: countBy(papers, (p) => p.status),
    }),
    [papers],
  );

  return (
    <div className="space-y-4">
      <StaggerList className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StaggerItem><StatCard label="Members" value={memberCount} icon={Users} /></StaggerItem>
        <StaggerItem><StatCard label="Papers logged" value={papers.length} icon={Library} /></StaggerItem>
        <StaggerItem><StatCard label="Papers read" value={d.completed} icon={BookCheck} /></StaggerItem>
        <StaggerItem><StatCard label="Topics" value={topicCount} icon={Tags} /></StaggerItem>
        <StaggerItem><StatCard label="Open deadlines" value={upcomingVenues} icon={CalendarClock} /></StaggerItem>
        <StaggerItem><StatCard label="Submissions" value={submissionCount} icon={Send} /></StaggerItem>
      </StaggerList>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Lab papers per month" description="Last 12 months" empty={!papers.length}>
          <PapersPerMonthChart data={d.monthly} />
        </ChartCard>
        <ChartCard title="Topics across the lab" empty={!d.topics.length}>
          <TopicsPieChart data={d.topics} />
        </ChartCard>
        <ChartCard title="Papers by type" empty={!d.types.length}>
          <HorizontalBarChart data={d.types} />
        </ChartCard>
        <ChartCard title="Top readers" description="Completed papers per member" empty={!d.readers.length}>
          <HorizontalBarChart data={d.readers} color="var(--series-3)" />
        </ChartCard>
      </div>
    </div>
  );
}
