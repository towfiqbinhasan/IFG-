"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileUp, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { Rating } from "@/components/shared/rating";
import { TopicMultiSelect } from "./topic-multi-select";
import { createClient } from "@/lib/supabase/client";
import { PAPER_STATUSES, PAPER_TYPES, READ_METHODS } from "@/lib/constants";
import type { PaperWithRelations, Topic } from "@/lib/types";

const MAX_PDF_MB = 50;

type FormState = {
  title: string;
  authors: string;
  year: string;
  venue: string;
  doi_url: string;
  paper_type: string;
  status: string;
  date_read: string;
  read_method: string;
  hours: string;
  minutes: string;
  summary: string;
  key_contributions: string;
  methodology: string;
  results: string;
  limitations: string;
  notes: string;
  rating: number | null;
  topicIds: string[];
};

function toState(p?: PaperWithRelations): FormState {
  const mins = p?.time_spent_minutes ?? 0;
  return {
    title: p?.title ?? "",
    authors: p?.authors ?? "",
    year: p?.year ? String(p.year) : "",
    venue: p?.venue ?? "",
    doi_url: p?.doi_url ?? "",
    paper_type: p?.paper_type ?? "Empirical",
    status: p?.status ?? "To read",
    date_read: p?.date_read ?? "",
    read_method: p?.read_method ?? "none",
    hours: mins ? String(Math.floor(mins / 60)) : "",
    minutes: mins ? String(mins % 60) : "",
    summary: p?.summary ?? "",
    key_contributions: p?.key_contributions ?? "",
    methodology: p?.methodology ?? "",
    results: p?.results ?? "",
    limitations: p?.limitations ?? "",
    notes: p?.notes ?? "",
    rating: p?.rating ?? null,
    topicIds: p?.topics.map((t) => t.id) ?? [],
  };
}

/** Create / edit a paper log entry, including topics and optional PDF. */
export function PaperForm({ paper, topics: initialTopics, userId }: { paper?: PaperWithRelations; topics: Topic[]; userId: string }) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(() => toState(paper));
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [pdf, setPdf] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }));
  const text = (k: keyof FormState) => ({
    value: s[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });

  function validate() {
    const e: typeof errors = {};
    if (!s.title.trim()) e.title = "Title is required.";
    const y = Number(s.year);
    if (s.year && (!Number.isInteger(y) || y < 1900 || y > 2100)) e.year = "Enter a valid year.";
    if (s.status === "Completed" && !s.date_read) e.date_read = "Add the date you finished reading.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return toast.error("Please fix the highlighted fields.");
    if (pdf && pdf.size > MAX_PDF_MB * 1024 * 1024) return toast.error(`PDF must be under ${MAX_PDF_MB} MB.`);

    setSaving(true);
    const supabase = createClient();
    const minutes = (Number(s.hours) || 0) * 60 + (Number(s.minutes) || 0);
    const payload = {
      title: s.title.trim(),
      authors: s.authors.trim() || null,
      year: s.year ? Number(s.year) : null,
      venue: s.venue.trim() || null,
      doi_url: s.doi_url.trim() || null,
      paper_type: s.paper_type,
      status: s.status,
      date_read: s.date_read || null,
      read_method: s.read_method === "none" ? null : s.read_method,
      time_spent_minutes: minutes || null,
      summary: s.summary.trim() || null,
      key_contributions: s.key_contributions.trim() || null,
      methodology: s.methodology.trim() || null,
      results: s.results.trim() || null,
      limitations: s.limitations.trim() || null,
      notes: s.notes.trim() || null,
      rating: s.rating,
    };

    try {
      // 1. Upsert the paper row.
      let paperId = paper?.id;
      if (paperId) {
        const { error } = await supabase.from("papers").update(payload).eq("id", paperId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("papers").insert({ ...payload, user_id: userId }).select("id").single();
        if (error) throw error;
        paperId = data.id as string;
      }

      // 2. Sync topics (replace the set).
      const before = new Set(paper?.topics.map((t) => t.id) ?? []);
      const after = new Set(s.topicIds);
      const toRemove = Array.from(before).filter((id) => !after.has(id));
      const toAdd = Array.from(after).filter((id) => !before.has(id));
      if (toRemove.length) {
        const { error } = await supabase.from("paper_topics").delete().eq("paper_id", paperId).in("topic_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("paper_topics").insert(toAdd.map((topic_id) => ({ paper_id: paperId, topic_id })));
        if (error) throw error;
      }

      // 3. PDF: path is "<owner_id>/<paper_id>/<timestamp>-<name>" (storage RLS requires owner folder).
      const ownerId = paper?.user_id ?? userId;
      if ((pdf || removePdf) && paper?.pdf_path) {
        await supabase.storage.from("papers").remove([paper.pdf_path]);
      }
      if (pdf) {
        const safe = pdf.name.replace(/[^\w.-]+/g, "_").slice(-80);
        const path = `${ownerId}/${paperId}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from("papers").upload(path, pdf, { contentType: "application/pdf", upsert: false });
        if (error) throw error;
        await supabase.from("papers").update({ pdf_path: path }).eq("id", paperId);
      } else if (removePdf) {
        await supabase.from("papers").update({ pdf_path: null }).eq("id", paperId);
      }

      toast.success(paper ? "Paper updated" : "Paper added to your log");
      router.push(`/papers/${paperId}`);
      router.refresh();
    } catch (err) {
      toast.error((err as { message?: string }).message ?? "Could not save the paper.");
      setSaving(false);
    }
  }

  const section = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { delay: i * 0.06 } } });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <motion.div {...section(0)}>
        <Card>
          <CardHeader>
            <CardTitle>Bibliographic details</CardTitle>
            <CardDescription>What is the paper?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" required error={errors.title} className="sm:col-span-2">
              <Input id="title" {...text("title")} placeholder="Attention Is All You Need" />
            </Field>
            <Field label="Authors" htmlFor="authors" hint="Comma-separated" className="sm:col-span-2">
              <Input id="authors" {...text("authors")} placeholder="A. Vaswani, N. Shazeer, …" />
            </Field>
            <Field label="Year" htmlFor="year" error={errors.year}>
              <Input id="year" inputMode="numeric" {...text("year")} placeholder="2017" />
            </Field>
            <Field label="Venue" htmlFor="venue" hint="Conference or journal name">
              <Input id="venue" {...text("venue")} placeholder="NeurIPS" />
            </Field>
            <Field label="DOI / URL" htmlFor="doi" className="sm:col-span-2">
              <Input id="doi" {...text("doi_url")} placeholder="10.48550/arXiv.1706.03762 or https://…" />
            </Field>
            <Field label="PDF (optional)" htmlFor="pdf" hint={`PDF only, up to ${MAX_PDF_MB} MB`} className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="pdf"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent"
                >
                  <FileUp className="h-4 w-4" />
                  {pdf ? pdf.name : paper?.pdf_path && !removePdf ? "Replace PDF" : "Choose PDF"}
                </label>
                <input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    setPdf(e.target.files?.[0] ?? null);
                    setRemovePdf(false);
                  }}
                />
                {paper?.pdf_path && !pdf && !removePdf && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRemovePdf(true)}>
                    <Trash2 /> Remove current PDF
                  </Button>
                )}
                {removePdf && <span className="text-xs text-muted-foreground">PDF will be removed on save.</span>}
              </div>
            </Field>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...section(1)}>
        <Card>
          <CardHeader>
            <CardTitle>Classification & reading</CardTitle>
            <CardDescription>How does it fit into your research, and how did you read it?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Paper type">
              <Select value={s.paper_type} onValueChange={(v) => set("paper_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={s.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPER_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Research topics" className="sm:col-span-2" hint="Type to search; press Enter to create a new topic.">
              <TopicMultiSelect
                allTopics={topics}
                value={s.topicIds}
                onChange={(ids) => set("topicIds", ids)}
                onTopicCreated={(t) => setTopics((ts) => [...ts, t].sort((a, b) => a.name.localeCompare(b.name)))}
                userId={userId}
              />
            </Field>
            <Field label="Date read" htmlFor="date_read" error={errors.date_read}>
              <Input id="date_read" type="date" {...text("date_read")} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="How I read it">
              <Select value={s.read_method} onValueChange={(v) => set("read_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {READ_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Time spent">
              <div className="flex items-center gap-2">
                <Input inputMode="numeric" aria-label="Hours" placeholder="0" {...text("hours")} className="w-20" />
                <span className="text-sm text-muted-foreground">h</span>
                <Input inputMode="numeric" aria-label="Minutes" placeholder="45" {...text("minutes")} className="w-20" />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </Field>
            <Field label="Rating">
              <div className="flex h-10 items-center">
                <Rating value={s.rating} onChange={(v) => set("rating", v)} size={24} />
              </div>
            </Field>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...section(2)}>
        <Card>
          <CardHeader>
            <CardTitle>Notes & analysis</CardTitle>
            <CardDescription>Your understanding of the paper. All fields optional.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Summary" className="md:col-span-2"><Textarea {...text("summary")} rows={4} placeholder="What is this paper about, in a few sentences?" /></Field>
            <Field label="Key contributions"><Textarea {...text("key_contributions")} /></Field>
            <Field label="Methodology"><Textarea {...text("methodology")} /></Field>
            <Field label="Results"><Textarea {...text("results")} /></Field>
            <Field label="Limitations"><Textarea {...text("limitations")} /></Field>
            <Field label="My notes" className="md:col-span-2"><Textarea {...text("notes")} rows={4} placeholder="Ideas, questions, links to your own work…" /></Field>
          </CardContent>
        </Card>
      </motion.div>

      <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-xl border bg-background/90 p-3 backdrop-blur lg:bottom-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {!saving && <Save />}
          {paper ? "Save changes" : "Add paper"}
        </Button>
      </div>
    </form>
  );
}
