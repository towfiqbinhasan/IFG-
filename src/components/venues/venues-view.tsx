"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { DeadlineCard } from "./deadline-card";
import { CalendarView } from "./calendar-view";
import { UrgencyLegend } from "./countdown";
import { nextDeadline } from "@/lib/deadlines";
import type { Venue } from "@/lib/types";

type When = "upcoming" | "past" | "all";

/** Deadlines page body: filters + list/calendar tabs. */
export function VenuesView({ venues, submitterCounts, action }: { venues: Venue[]; submitterCounts: Record<string, number>; action?: React.ReactNode }) {
  const [when, setWhen] = useState<When>("upcoming");
  const [type, setType] = useState("all");
  const [field, setField] = useState("all");
  const [q, setQ] = useState("");

  const fields = useMemo(() => Array.from(new Set(venues.map((v) => v.field).filter(Boolean) as string[])).sort(), [venues]);

  // Type / field / search filters apply to both views; "when" applies to the list only
  // (the calendar always shows past and future dates).
  const base = useMemo(() => {
    const query = q.trim().toLowerCase();
    return venues.filter((v) => {
      if (type !== "all" && v.type !== type) return false;
      if (field !== "all" && v.field !== field) return false;
      if (query && !`${v.name} ${v.field ?? ""} ${v.location ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [venues, type, field, q]);

  const filtered = useMemo(() => {
    const now = new Date();
    return base
      .map((v) => ({ v, next: nextDeadline(v, now) }))
      .filter(({ next }) => {
        const upcoming = !!next && next.date >= now;
        if (when === "upcoming" && !upcoming) return false;
        if (when === "past" && upcoming) return false;
        return true;
      })
      .sort((a, b) => {
        const ad = a.next?.date.getTime() ?? Infinity;
        const bd = b.next?.date.getTime() ?? Infinity;
        return when === "past" ? bd - ad : ad - bd; // nearest first; past = most recent first
      })
      .map(({ v }) => v);
  }, [base, when]);

  return (
    <Tabs defaultValue="list">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="self-start">
          <TabsTrigger value="list"><List /> List</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays /> Calendar</TabsTrigger>
        </TabsList>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search venues" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={when} onValueChange={(v) => setWhen(v as When)}>
            <SelectTrigger className="sm:w-36" aria-label="When"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-36" aria-label="Type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="conference">Conferences</SelectItem>
              <SelectItem value="journal">Journals</SelectItem>
            </SelectContent>
          </Select>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="col-span-2 sm:w-44" aria-label="Field / topic"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fields / topics</SelectItem>
              {fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          {action}
        </div>
      </div>

      <div className="mt-3"><UrgencyLegend /></div>

      <TabsContent value="list">
        {filtered.length === 0 ? (
          <EmptyState
            illustration="calendar"
            title={venues.length ? "No venues match these filters" : "No venues yet"}
            description={venues.length ? "Try switching to “All” or clearing filters." : "Add the conferences and journals your lab is targeting."}
          />
        ) : (
          <motion.div layout className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((v, i) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }} exit={{ opacity: 0 }}>
                  <DeadlineCard venue={v} submitters={submitterCounts[v.id] ?? 0} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </TabsContent>
      <TabsContent value="calendar">
        <CalendarView venues={base} />
      </TabsContent>
    </Tabs>
  );
}
