"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { PaperWithRelations } from "@/lib/types";

/** Admin list of every paper with delete (moderation). */
export function PapersModeration({ papers }: { papers: PaperWithRelations[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return papers.filter((p) => !s || `${p.title} ${p.author?.full_name ?? ""} ${p.author?.username ?? ""}`.toLowerCase().includes(s));
  }, [papers, q]);

  async function remove(p: PaperWithRelations) {
    const supabase = createClient();
    if (p.pdf_path) await supabase.storage.from("papers").remove([p.pdf_path]);
    const { error } = await supabase.from("papers").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Paper deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by title or member" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">{list.length} papers</p>
      <Card className="divide-y">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <Link href={`/papers/${p.id}`} className="line-clamp-1 font-medium hover:text-primary">{p.title}</Link>
              <p className="truncate text-xs text-muted-foreground">
                {p.author?.full_name ?? "Unknown"} · {format(new Date(p.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <StatusBadge status={p.status} className="hidden sm:inline-flex" />
            <ConfirmDialog
              trigger={<Button variant="ghost" size="icon" aria-label="Delete paper" className="text-destructive hover:text-destructive"><Trash2 /></Button>}
              title="Delete this paper?"
              description={`“${p.title}” by ${p.author?.full_name ?? "unknown"} will be permanently removed.`}
              confirmLabel="Delete"
              onConfirm={() => remove(p)}
            />
          </div>
        ))}
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No papers.</p>}
      </Card>
    </div>
  );
}
