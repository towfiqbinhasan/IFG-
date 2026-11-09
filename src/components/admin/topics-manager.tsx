"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { Topic } from "@/lib/types";

/** Create, rename, recolour and delete topics. */
export function TopicsManager({ topics, counts, userId }: { topics: Topic[]; counts: Record<string, number>; userId: string }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#2a78d6");

  const supabase = createClient();
  const done = (msg: string) => {
    toast.success(msg);
    router.refresh();
  };
  const fail = (e: { message: string; code?: string }) =>
    toast.error(e.code === "23505" ? "A topic with that name already exists." : e.message);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { error } = await supabase.from("topics").insert({ name: newName.trim(), created_by: userId, color: "#2a78d6" });
    if (error) return fail(error);
    setNewName("");
    done("Topic created");
  }

  async function save(id: string) {
    const { error } = await supabase.from("topics").update({ name: editName.trim(), color: editColor }).eq("id", id);
    if (error) return fail(error);
    setEditId(null);
    done("Topic updated");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) return fail(error);
    done("Topic deleted");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex max-w-md gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New topic name" />
        <Button type="submit"><Plus /> Add</Button>
      </form>
      <Card className="divide-y">
        {topics.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3">
            {editId === t.id ? (
              <>
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" aria-label="Topic colour" />
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 flex-1" autoFocus />
                <Button size="icon" variant="ghost" onClick={() => save(t.id)} aria-label="Save"><Check /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditId(null)} aria-label="Cancel"><X /></Button>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full" style={{ background: t.color ?? "hsl(var(--primary))" }} />
                <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{counts[t.id] ?? 0} papers</span>
                <Button size="icon" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => { setEditId(t.id); setEditName(t.name); setEditColor(t.color ?? "#2a78d6"); }}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={<Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Delete ${t.name}`}><Trash2 /></Button>}
                  title={`Delete topic “${t.name}”?`}
                  description={`It will be removed from ${counts[t.id] ?? 0} paper(s). The papers themselves are kept.`}
                  confirmLabel="Delete"
                  onConfirm={() => remove(t.id)}
                />
              </>
            )}
          </div>
        ))}
        {topics.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No topics yet.</p>}
      </Card>
    </div>
  );
}
