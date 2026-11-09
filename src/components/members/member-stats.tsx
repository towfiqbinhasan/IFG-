"use client";

import { useMemo } from "react";
import { BookCheck, Clock, Flame, Library, Tags } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import { ChartCard } from "@/components/charts/chart-card";
import { PapersPerMonthChart } from "@/components/charts/papers-per-month-chart";
import { TopicsPieChart } from "@/components/charts/topics-pie-chart";
import { papersPerMonth, readingStreak, topicCounts } from "@/lib/stats";
import type { PaperWithRelations } from "@/lib/types";

/** Stat tiles + charts for one member's papers (dashboard and public profile). */
export function MemberStats({ papers }: { papers: PaperWithRelations[] }) {
  const s = useMemo(() => {
    const completed = papers.filter((p) => p.status === "Completed");
    const topicSet = new Set(papers.flatMap((p) => p.topics.map((t) => t.id)));
    const minutes = papers.reduce((sum, p) => sum + (p.time_spent_minutes ?? 0), 0);
    return {
      completed: completed.length,
      total: papers.length,
      reading: papers.filter((p) => p.status === "Reading").length,
      topics: topicSet.size,
      hours: Math.round(minutes / 60),
      streak: readingStreak(papers),
      monthly: papersPerMonth(completed.length ? completed : papers),
      topicData: topicCounts(papers),
    };
  }, [papers]);

  return (
    <div className="space-y-4">
      <StaggerList className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StaggerItem><StatCard label="Papers read" value={s.completed} icon={BookCheck} hint={`${s.reading} in progress`} /></StaggerItem>
        <StaggerItem><StatCard label="Logged" value={s.total} icon={Library} hint="All statuses" /></StaggerItem>
        <StaggerItem><StatCard label="Topics" value={s.topics} icon={Tags} hint="Distinct topics covered" /></StaggerItem>
        <StaggerItem><StatCard label="Streak" value={s.streak.current} suffix="days" icon={Flame} hint={`Best: ${s.streak.best} days`} /></StaggerItem>
        <StaggerItem className="col-span-2 lg:col-span-1"><StatCard label="Time reading" value={s.hours} suffix="h" icon={Clock} hint="Logged time spent" /></StaggerItem>
      </StaggerList>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Papers per month" description="Last 12 months, by date read" empty={!papers.length}>
          <PapersPerMonthChart data={s.monthly} />
        </ChartCard>
        <ChartCard title="Topics" description="Share of tagged papers" empty={!s.topicData.length}>
          <TopicsPieChart data={s.topicData} />
        </ChartCard>
      </div>
    </div>
  );
}
