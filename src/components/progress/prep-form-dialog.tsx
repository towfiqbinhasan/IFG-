"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { createClient } from "@/lib/supabase/client";
import { PREP_CATEGORIES, PREP_STATUSES } from "@/lib/constants";
import type { Preparation, Topic } from "@/lib/types";

/** Create or edit a preparation. On create, the starting % becomes the first timeline entry. */
export function PrepFormDialog({
  prep,
  topics,
  userId,
  trigger,
  defaultTopicId,
}: {
  prep?: Preparation;
  topics: Pick<Topic, "id" | "name">[];
  userId: string;
  trigger: React.ReactNode;
  defaultTopicId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(prep?.title ?? "");
  const [category, setCategory] = useState<string>(prep?.category ?? "Topic study");
  const [topicId, setTopicId] = useState(prep?.topic_id ?? defaultTopicId ?? "none");
  const [targetDate, setTargetDate] = useState(prep?.target_date ?? "");
  const [description, setDescription] = useState(prep?.description ?? "");
  const [status, setStatus] = useState<string>(prep?.status ?? "Active");
  const [start, setStart] = useState(0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!title.trim()) return toast.error("Give it a title");
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: title.trim(),
      category,
      topic_id: topicId === "none" ? null : topicId,
      target_date: targetDate || null,
      description: description.trim() || null,
    };
    let id = prep?.id;
    if (prep) {
      const { error } = await supabase.from("preparations").update({ ...payload, status }).eq("id", prep.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase.from("preparations").insert({ ...payload, user_id: userId }).select("id").single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
      id = data.id as string;
      // First timeline entry ("Started at X %").
      await supabase.from("preparation_updates").insert({ preparation_id: id, user_id: userId, progress: start, note: "Started" });
    }
    setSaving(false);
    toast.success(prep ? "Preparation updated" : "Preparation added — the lab can follow your progress 🚀");
    setOpen(false);
    if (!prep) router.push(`/progress/${id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{prep ? "Edit preparation" : "New preparation"}</DialogTitle>
          <DialogDescription>Something you&apos;re working towards. Everyone in the lab can see it and its progress.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Master diffusion models" />
          </Field>
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PREP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Research topic">
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No topic</SelectItem>
                {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Target date">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          {prep ? (
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PREP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label={`Starting progress: ${start}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--brand-blue)]"
                aria-label="Starting progress"
              />
            </Field>
          )}
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Goal, plan, resources…" />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="forge" loading={saving}>{prep ? "Save" : "Add preparation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
