"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PrepFormDialog } from "./prep-form-dialog";
import { UpdateDialog } from "./update-dialog";
import { createClient } from "@/lib/supabase/client";
import type { Preparation, Topic } from "@/lib/types";

/** Detail-page actions: owner posts updates / edits / deletes; admin can delete. */
export function PrepActions({
  prep,
  topics,
  userId,
  isOwner,
  isAdmin,
}: {
  prep: Preparation;
  topics: Pick<Topic, "id" | "name">[];
  userId: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  async function remove() {
    const { error } = await createClient().from("preparations").delete().eq("id", prep.id);
    if (error) return toast.error(error.message);
    toast.success("Preparation deleted");
    router.push("/progress");
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      {isOwner && (
        <>
          <UpdateDialog
            prepId={prep.id}
            prepTitle={prep.title}
            current={prep.progress}
            userId={userId}
            trigger={<Button variant="forge"><TrendingUp /> Post update</Button>}
          />
          <PrepFormDialog prep={prep} topics={topics} userId={userId} trigger={<Button variant="outline"><Pencil /> Edit</Button>} />
        </>
      )}
      {(isOwner || isAdmin) && (
        <ConfirmDialog
          trigger={<Button variant="outline" className="text-destructive hover:text-destructive"><Trash2 /> Delete</Button>}
          title="Delete this preparation?"
          description="Its whole progress timeline will be removed for everyone."
          confirmLabel="Delete"
          onConfirm={remove}
        />
      )}
    </div>
  );
}
