"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Eye, Lock, MessagesSquare, Search, Trash2, Unlock, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ChatThread } from "@/components/chat/chat-thread";
import type { Person } from "@/components/chat/chat-dialogs";
import { createClient } from "@/lib/supabase/client";
import { purgeConversationFiles } from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationMember } from "@/lib/types";

export type AdminConversation = Conversation & { members: ConversationMember[]; messages: { count: number }[] };

type Filter = "all" | "direct" | "group" | "blocked";

/** Admin view of every chat in the lab: read, block/unblock, delete. */
export function ChatsModeration({ conversations, people, meId }: { conversations: AdminConversation[]; people: Person[]; meId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<AdminConversation | null>(null);
  const [deleting, setDeleting] = useState<AdminConversation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const title = (c: AdminConversation) =>
    c.kind === "group" ? c.name || "Group" : c.members.map((m) => m.profile?.full_name ?? "Former member").join(" ↔ ") || "Direct chat";

  const counts = useMemo(
    () => ({
      all: conversations.length,
      direct: conversations.filter((c) => c.kind === "direct").length,
      group: conversations.filter((c) => c.kind === "group").length,
      blocked: conversations.filter((c) => c.is_locked).length,
    }),
    [conversations],
  );

  const list = conversations.filter((c) => {
    if (filter === "direct" && c.kind !== "direct") return false;
    if (filter === "group" && c.kind !== "group") return false;
    if (filter === "blocked" && !c.is_locked) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [title(c), ...c.members.map((m) => m.profile?.username ?? "")].join(" ").toLowerCase().includes(s);
  });

  async function setLock(c: AdminConversation, locked: boolean) {
    setBusy(c.id);
    const { error } = await createClient().from("conversations").update({ is_locked: locked }).eq("id", c.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(locked ? "Chat blocked" : "Chat unblocked");
    router.refresh();
  }

  async function remove(c: AdminConversation) {
    setBusy(c.id);
    const supabase = createClient();
    await purgeConversationFiles(supabase, c.id);
    const { error } = await supabase.from("conversations").delete().eq("id", c.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Chat deleted");
    setDeleting(null);
    router.refresh();
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "direct", label: "Direct" },
    { key: "group", label: "Groups" },
    { key: "blocked", label: "Blocked" },
  ];

  return (
    <div className="space-y-4">
      <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        Every chat in the lab is listed here. <strong className="text-foreground">Block</strong> stops anyone sending new messages in a chat (members can
        still read it). <strong className="text-foreground">Delete</strong> removes the chat, its messages and files for everyone. To stop a person
        using the app entirely, block their account in <strong className="text-foreground">Users</strong>.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by group or member" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Filter chats">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {f.label} <span className="opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="divide-y overflow-hidden">
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No chats here yet.</p>}
        {list.map((c) => (
          <div key={c.id} className={cn("flex items-center gap-3 p-3 sm:p-4", c.is_locked && "bg-destructive/[0.04]")}>
            {c.kind === "group" ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forge text-white"><Users className="h-5 w-5" /></span>
            ) : (
              <div className="flex shrink-0 -space-x-3">
                {c.members.slice(0, 2).map((m) => (
                  <UserAvatar key={m.user_id} name={m.profile?.full_name} src={m.profile?.avatar_url} className="h-9 w-9 border-2 border-card" />
                ))}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-medium">
                <span className="truncate">{title(c)}</span>
                <Badge variant="outline">{c.kind === "group" ? "Group" : "Direct"}</Badge>
                {c.is_locked && <Badge variant="destructive"><Lock className="h-3 w-3" />Blocked</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {c.members.length} member{c.members.length === 1 ? "" : "s"} · {c.messages?.[0]?.count ?? 0} messages · active{" "}
                {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setViewing(c)} title="View messages">
                <Eye /> <span className="hidden md:inline">View</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={busy === c.id && !deleting}
                className={c.is_locked ? "text-emerald-600 hover:text-emerald-600 dark:text-emerald-400" : "text-amber-600 hover:text-amber-600 dark:text-amber-400"}
                onClick={() => setLock(c, !c.is_locked)}
                title={c.is_locked ? "Unblock chat" : "Block chat"}
              >
                {busy !== c.id && (c.is_locked ? <Unlock /> : <Lock />)} <span className="hidden md:inline">{c.is_locked ? "Unblock" : "Block"}</span>
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(c)} title="Delete chat">
                <Trash2 /> <span className="hidden md:inline">Delete</span>
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Read the chat (admins can delete individual messages, block or delete from the header menu) */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="flex h-[85dvh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{viewing ? title(viewing) : "Chat"}</DialogTitle>
            <DialogDescription>Admin view of this chat</DialogDescription>
          </DialogHeader>
          {viewing && (
            <ChatThread
              className="h-full"
              conversation={viewing}
              members={viewing.members}
              people={people}
              meId={meId}
              isAdmin
              onChanged={() => router.refresh()}
              onRemoved={() => {
                setViewing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              “{deleting ? title(deleting) : ""}” and all {deleting?.messages?.[0]?.count ?? 0} messages and files are permanently deleted for everyone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" loading={busy === deleting?.id} onClick={() => deleting && remove(deleting)}>
              <MessagesSquare /> Delete chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
