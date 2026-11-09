"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Globe, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Countdown } from "./countdown";
import { URGENCY_STYLES, nextDeadline, urgencyOf } from "@/lib/deadlines";
import { cn, posterUrl } from "@/lib/utils";
import type { Venue } from "@/lib/types";

/** One venue with its next deadline + live countdown; left border carries urgency colour. */
export function DeadlineCard({ venue, submitters = 0 }: { venue: Venue; submitters?: number }) {
  const next = nextDeadline(venue);
  const urgency = next ? urgencyOf(next.date) : "passed";
  const poster = posterUrl(venue.poster_path);

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
      <Card className={cn("relative border-l-4 p-4 transition-shadow hover:shadow-md", URGENCY_STYLES[urgency].ring)}>
        <div className="flex items-start justify-between gap-3">
          {poster && (
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image src={poster} alt={`${venue.name} poster`} fill unoptimized sizes="48px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/venues/${venue.id}`} className="after:absolute after:inset-0">
              <h3 className="truncate font-semibold hover:text-primary">{venue.name}</h3>
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="capitalize">{venue.type}</span>
              {venue.field && <span>{venue.field}</span>}
              {venue.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venue.location}
                </span>
              )}
              {venue.website && <Globe className="h-3 w-3" aria-label="Has website" />}
            </p>
          </div>
          {submitters > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs" title="Members planning to submit">
              <Users className="h-3 w-3" /> {submitters}
            </span>
          )}
        </div>
        {next ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="text-muted-foreground">{next.label}: </span>
              <span className="font-medium">{format(next.date, "EEE, MMM d yyyy · HH:mm")}</span>
            </div>
            <Countdown date={next.date} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No dates set</p>
        )}
      </Card>
    </motion.div>
  );
}
