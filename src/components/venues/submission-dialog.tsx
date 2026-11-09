"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { createClient } from "@/lib/supabase/client";
import { SUBMISSION_STATUSES } from "@/lib/constants";
import type { Submission } from "@/lib/types";

/** "I'm planning to submit" — create or update the member's own submission to a venue. */
export function SubmissionDialog({
  venueId,
  userId,
  submission,
  trigger,
}: {
  venueId: string;
  userId: string;
  submission?: Submission;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(submission?.paper_title ?? "");
  const [status, setStatus] = useState<string>(submission?.status ?? "Planning");
  const [notes, setNotes] = useState(submission?.notes ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Add your paper's (working) title");
    setSaving(true);
    const supabase = createClient();
    const payload = { paper_title: title.trim(), status, notes: notes.trim() || null };
    const { error } = submission
      ? await supabase.from("submissions").update(payload).eq("id", submission.id)
      : await supabase.from("submissions").insert({ ...payload, venue_id: venueId, user_id: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submission ? "Submission updated" : "Added to your submission plans 🎯");
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!submission) return;
    setSaving(true);
    const { error } = await createClient().from("submissions").delete().eq("id", submission.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Submission removed");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{submission ? "Update submission" : "I'm planning to submit"}</DialogTitle>
          <DialogDescription>Let the lab know what you are submitting here.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Field label="Paper title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title of your paper" />
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBMISSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Co-authors, track, submission ID…" />
          </Field>
          <DialogFooter>
            {submission && (
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" onClick={remove} disabled={saving}>
                Remove
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
