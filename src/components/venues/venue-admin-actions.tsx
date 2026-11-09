"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VenueFormDialog } from "./venue-form-dialog";
import { createClient } from "@/lib/supabase/client";
import type { Venue } from "@/lib/types";

/** Edit/delete buttons for a venue (creator or admin). */
export function VenueManageActions({ venue, userId, redirectTo }: { venue: Venue; userId: string; redirectTo?: string }) {
  const router = useRouter();
  async function remove() {
    const { error } = await createClient().from("venues").delete().eq("id", venue.id);
    if (error) return toast.error(error.message);
    toast.success("Venue deleted");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }
  return (
    <>
      <VenueFormDialog venue={venue} userId={userId} trigger={<Button variant="outline" size="sm"><Pencil /> Edit</Button>} />
      <ConfirmDialog
        trigger={<Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Delete</Button>}
        title={`Delete ${venue.name}?`}
        description="All submission plans linked to this venue will be removed too."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </>
  );
}
