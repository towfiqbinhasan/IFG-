"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { ProgressBar } from "./progress-bar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Owner posts a progress update (new % + note); a DB trigger moves the bar. */
export function UpdateDialog({
  prepId,
  prepTitle,
  current,
  userId,
  trigger,
}: {
  prepId: string;
  prepTitle: string;
  current: number;
  userId: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setValue(current);
      setNote("");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (value === current && !note.trim()) return toast.error("Change the progress or write a note.");
    setSaving(true);
    const { error } = await createClient()
      .from("preparation_updates")
      .insert({ preparation_id: prepId, user_id: userId, progress: value, note: note.trim() || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(value === 100 ? "Completed! 🎉" : `Progress updated to ${value}%`);
    setOpen(false);
    router.refresh();
  }

  const delta = value - current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Post a progress update</DialogTitle>
            <DialogDescription className="line-clamp-2">{prepTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="font-display text-4xl font-extrabold tabular-nums text-forge">{value}%</span>
              {delta !== 0 && (
                <span className={cn("text-sm font-semibold", delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {delta > 0 ? "+" : ""}
                  {delta}% from {current}%
                </span>
              )}
            </div>
            <ProgressBar value={value} showLabel={false} size="lg" />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full accent-[var(--brand-blue)]"
              aria-label="Progress percent"
            />
            <div className="flex flex-wrap gap-1.5">
              {[10, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(v)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    value === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <Field label="What did you do?" hint="Visible to the whole lab.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="e.g. Finished chapter 3, reproduced the baseline, drafted the related-work section…"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="forge" loading={saving}>
              {!saving && <TrendingUp />} Post update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
