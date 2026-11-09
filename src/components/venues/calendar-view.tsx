"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { URGENCY_STYLES, urgencyOf, venueEvents, type DeadlineEvent } from "@/lib/deadlines";
import { cn } from "@/lib/utils";
import type { Venue } from "@/lib/types";

/** Month calendar of every venue date; tap a day to list its events. */
export function CalendarView({ venues }: { venues: Venue[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [direction, setDirection] = useState(0);
  const events = useMemo(() => venueEvents(venues), [venues]);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const byDay = (d: Date) => events.filter((e) => isSameDay(e.date, d));
  const selectedEvents = byDay(selected);

  function go(delta: number) {
    setDirection(delta);
    setMonth((m) => addMonths(m, delta));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{format(month, "MMMM yyyy")}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Next month"><ChevronRight /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={month.toISOString()}
            custom={direction}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((d) => {
              const evs = byDay(d);
              const isSel = isSameDay(d, selected);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex min-h-14 flex-col items-center gap-1 rounded-lg p-1 text-sm transition-colors sm:min-h-20 sm:items-start sm:p-1.5",
                    !isSameMonth(d, month) && "text-muted-foreground/50",
                    isSel ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent",
                  )}
                  aria-label={`${format(d, "PPP")}: ${evs.length} event${evs.length === 1 ? "" : "s"}`}
                >
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday(d) && "bg-primary font-semibold text-primary-foreground")}>
                    {format(d, "d")}
                  </span>
                  {/* Mobile: dots. Desktop: truncated labels. */}
                  <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {evs.slice(0, 3).map((e, i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", URGENCY_STYLES[urgencyOf(e.date)].dot)} />)}
                  </span>
                  <span className="hidden w-full flex-col gap-0.5 sm:flex">
                    {evs.slice(0, 2).map((e, i) => (
                      <span key={i} className={cn("truncate rounded px-1 text-left text-[10px]", URGENCY_STYLES[urgencyOf(e.date)].badge)}>
                        {e.venue.name}
                      </span>
                    ))}
                    {evs.length > 2 && <span className="text-[10px] text-muted-foreground">+{evs.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold">{format(selected, "EEEE, MMM d")}</h3>
        <div className="mt-3 space-y-2">
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deadlines on this day.</p>
          ) : (
            selectedEvents.map((e) => <EventRow key={`${e.venue.id}-${e.key}`} e={e} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function EventRow({ e }: { e: DeadlineEvent }) {
  const u = urgencyOf(e.date);
  return (
    <Link href={`/venues/${e.venue.id}`} className={cn("block rounded-lg border-l-4 bg-muted/50 p-3 hover:bg-accent", URGENCY_STYLES[u].ring)}>
      <p className="text-sm font-medium">{e.venue.name}</p>
      <p className="text-xs text-muted-foreground">
        {e.label} · {format(e.date, "HH:mm")}
      </p>
    </Link>
  );
}
