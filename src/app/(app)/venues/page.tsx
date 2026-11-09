import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { VenuesView } from "@/components/venues/venues-view";
import { VenueFormDialog } from "@/components/venues/venue-form-dialog";
import { getSessionProfile } from "@/lib/session";
import type { Venue } from "@/lib/types";

export const metadata = { title: "Deadlines" };

export default async function VenuesPage() {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: venues }, { data: subs }, { data: settings }] = await Promise.all([
    supabase.from("venues").select("*").order("submission_deadline", { ascending: true, nullsFirst: false }),
    supabase.from("submissions").select("venue_id"),
    supabase.from("app_settings").select("allow_member_venues").eq("id", 1).maybeSingle(),
  ]);

  const counts: Record<string, number> = {};
  for (const s of subs ?? []) counts[s.venue_id] = (counts[s.venue_id] ?? 0) + 1;

  const canAdd = profile.role === "admin" || (settings?.allow_member_venues ?? false);

  return (
    <>
      <PageHeader
        title="Conferences & journals"
        description="Upcoming deadlines with live countdowns. Mark the ones you plan to submit to."
        actions={
          canAdd && (
            <VenueFormDialog userId={profile.id} trigger={<Button variant="forge"><Plus /> Add venue</Button>} />
          )
        }
      />
      <VenuesView venues={(venues ?? []) as Venue[]} submitterCounts={counts} />
    </>
  );
}
