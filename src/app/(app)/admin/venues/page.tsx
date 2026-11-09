import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VenueFormDialog } from "@/components/venues/venue-form-dialog";
import { VenueManageActions } from "@/components/venues/venue-admin-actions";
import { requireAdmin } from "@/lib/session";
import type { Venue } from "@/lib/types";

export const metadata = { title: "Admin · Venues" };

export default async function AdminVenuesPage() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase.from("venues").select("*").order("submission_deadline", { ascending: false, nullsFirst: false });
  const venues = (data ?? []) as Venue[];
  return (
    <div className="space-y-4">
      <VenueFormDialog userId={profile.id} trigger={<Button><Plus /> Add venue</Button>} />
      <Card className="divide-y">
        {venues.map((v) => (
          <div key={v.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Link href={`/venues/${v.id}`} className="font-medium hover:text-primary">{v.name}</Link>
              <p className="text-xs capitalize text-muted-foreground">
                {v.type}
                {v.submission_deadline ? ` · submission ${format(new Date(v.submission_deadline), "MMM d, yyyy")}` : ""}
              </p>
            </div>
            <div className="flex gap-2"><VenueManageActions venue={v} userId={profile.id} /></div>
          </div>
        ))}
        {venues.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No venues yet.</p>}
      </Card>
    </div>
  );
}
