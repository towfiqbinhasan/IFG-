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
import { DEADLINE_FIELDS } from "@/lib/constants";
import type { Venue } from "@/lib/types";

/** ISO -> value for <input type="datetime-local"> in the viewer's local time. */
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : null;
}

/** Add / edit a conference or journal with its four key dates. */
export function VenueFormDialog({ venue, userId, trigger }: { venue?: Venue; userId: string; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    name: venue?.name ?? "",
    type: venue?.type ?? "conference",
    website: venue?.website ?? "",
    location: venue?.location ?? "",
    field: venue?.field ?? "",
    notes: venue?.notes ?? "",
    abstract_deadline: toLocalInput(venue?.abstract_deadline),
    submission_deadline: toLocalInput(venue?.submission_deadline),
    notification_date: toLocalInput(venue?.notification_date),
    camera_ready_date: toLocalInput(venue?.camera_ready_date),
  }));
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
      field: form.field.trim() || null,
      notes: form.notes.trim() || null,
      abstract_deadline: fromLocalInput(form.abstract_deadline),
      submission_deadline: fromLocalInput(form.submission_deadline),
      notification_date: fromLocalInput(form.notification_date),
      camera_ready_date: fromLocalInput(form.camera_ready_date),
    };
    const supabase = createClient();
    const { error } = venue
      ? await supabase.from("venues").update(payload).eq("id", venue.id)
      : await supabase.from("venues").insert({ ...payload, created_by: userId });
    setSaving(false);
    if (error) return toast.error(error.message.includes("row-level security") ? "You are not allowed to add venues." : error.message);
    toast.success(venue ? "Venue updated" : "Venue added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{venue ? "Edit venue" : "Add conference / journal"}</DialogTitle>
          <DialogDescription>Dates are entered in your local time zone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="ICML 2027" />
          </Field>
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Field / topic">
            <Input value={form.field} onChange={(e) => set("field", e.target.value)} placeholder="Machine Learning" />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Vienna, Austria / Online" />
          </Field>
          {DEADLINE_FIELDS.map((f) => (
            <Field key={f.key} label={`${f.label} ${f.key.endsWith("deadline") ? "deadline" : "date"}`}>
              <Input type="datetime-local" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            </Field>
          ))}
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Page limit, AoE time zone, template link…" />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{venue ? "Save" : "Add venue"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
