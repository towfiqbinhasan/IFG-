"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
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
import { posterUrl } from "@/lib/utils";
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
  const [poster, setPoster] = useState<File | null>(null);
  const [removePoster, setRemovePoster] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Local preview for a newly chosen poster.
  useEffect(() => {
    if (!poster) return setPreview(null);
    const url = URL.createObjectURL(poster);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [poster]);

  const currentPoster = preview ?? (!removePoster ? posterUrl(venue?.poster_path) : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (poster && poster.size > 10 * 1024 * 1024) return toast.error("Poster must be under 10 MB.");
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
    const res = venue
      ? await supabase.from("venues").update(payload).eq("id", venue.id).select("id").single()
      : await supabase.from("venues").insert({ ...payload, created_by: userId }).select("id").single();
    if (res.error) {
      setSaving(false);
      return toast.error(res.error.message.includes("row-level security") ? "You are not allowed to add venues." : res.error.message);
    }
    const venueId = res.data.id as string;

    // Poster: upload into "<my id>/<venue id>/..." (storage policy requires my own folder).
    try {
      if ((poster || removePoster) && venue?.poster_path) {
        await supabase.storage.from("venue-posters").remove([venue.poster_path]);
      }
      if (poster) {
        const safe = poster.name.replace(/[^\w.-]+/g, "_").slice(-60);
        const path = `${userId}/${venueId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("venue-posters").upload(path, poster, { contentType: poster.type, upsert: false });
        if (up.error) throw up.error;
        const { error } = await supabase.from("venues").update({ poster_path: path }).eq("id", venueId);
        if (error) throw error;
      } else if (removePoster) {
        await supabase.from("venues").update({ poster_path: null }).eq("id", venueId);
      }
    } catch (err) {
      const e = err as { message?: string };
      toast.error(
        /poster_path|bucket/i.test(e.message ?? "")
          ? "Venue saved, but posters aren't set up yet: ask the admin to run migration 005."
          : `Venue saved, but the poster failed: ${e.message ?? "unknown error"}`,
      );
    }
    setSaving(false);
    setPoster(null);
    setRemovePoster(false);
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
          <Field label="Poster / image (optional)" hint="Conference poster, call-for-papers image or logo — PNG, JPG, WebP or GIF, up to 10 MB" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              {currentPoster && (
                <div className="relative h-24 w-20 overflow-hidden rounded-lg border bg-muted">
                  <Image src={currentPoster} alt="Poster preview" fill unoptimized className="object-cover" />
                </div>
              )}
              <label htmlFor="venue-poster" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
                <ImagePlus className="h-4 w-4" />
                {poster ? poster.name : currentPoster ? "Replace image" : "Choose image"}
              </label>
              <input
                id="venue-poster"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  setPoster(e.target.files?.[0] ?? null);
                  setRemovePoster(false);
                }}
              />
              {currentPoster && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPoster(null);
                    setRemovePoster(!!venue?.poster_path);
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
          </Field>
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
