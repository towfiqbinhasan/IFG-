"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";
import { Lock, MessageCircle, MessageSquarePlus, Search, Shield, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ChatThread } from "./chat-thread";
import { NewChatDialog, type Person } from "./chat-dialogs";
import { useNotifications } from "./notifications-provider";
import { createClient } from "@/lib/supabase/client";
import { MEMBER_SELECT, conversationTitle, groupMembers, otherMember, previewText, type MemberMap } from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { ConversationMember, ConversationSummary } from "@/lib/types";


function listTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, "EEE");
  return format(d, "dd/MM/yy");
}


/** WhatsApp-style messenger: chat list on the left, the open chat on the right. */
export function ChatApp({
  meId,
  isAdmin,
  initialConversations,
  initialMembers,
  people,
}: {
  meId: string;
  isAdmin: boolean;
  initialConversations: ConversationSummary[];
  initialMembers: MemberMap;
  people: Person[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("c");
  const { refreshUnread } = useNotifications();
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState(initialConversations);
  const [members, setMembers] = useState(initialMembers);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<"direct" | "group" | null>(null);

  const select = useCallback((id: string | null) => router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false }), [router, pathname]);

  /** Reload the list (and members of any chat we haven't seen). */
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_conversations");
    if (error) return;
    const list = (data ?? []) as ConversationSummary[];
    setConvs(list);
    const ids = list.map((c) => c.id);
    if (ids.length) {
      const { data: rows } = await supabase.from("conversation_members").select(MEMBER_SELECT).in("conversation_id", ids);
      setMembers(groupMembers((rows ?? []) as unknown as ConversationMember[]));
    }
    refreshUnread();
  }, [supabase, refreshUnread]);

  // New messages in any of my chats re-order the list and update previews.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-list-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, meId, refresh]);

  // Opening a chat clears its unread badge locally.
  useEffect(() => {
    if (selectedId) setConvs((cs) => cs.map((c) => (c.id === selectedId ? { ...c, unread: 0 } : c)));
  }, [selectedId]);

  const selected = convs.find((c) => c.id === selectedId) ?? null;
  // A chat opened by link that isn't in the list yet (just created) -> refresh once.
  useEffect(() => {
    if (selectedId && !selected) refresh();
  }, [selectedId, selected, refresh]);

  const shown = convs.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || conversationTitle(c, members[c.id] ?? [], meId).toLowerCase().includes(s);
  });
  const contactable = people.filter((p) => p.id !== meId && p.is_active);
  const admins = contactable.filter((p) => p.role === "admin");

  async function messageAdmin() {
    const admin = admins[0];
    if (!admin) return toast.error("No admin is available right now.");
    const { data, error } = await supabase.rpc("start_direct_chat", { p_other: admin.id });
    if (error || !data) return toast.error(error?.message ?? "Could not open the chat");
    await refresh();
    select(data as string);
  }

  return (
    <div className="grid h-[calc(100dvh-8.5rem)] min-h-[520px] overflow-hidden rounded-2xl border bg-card shadow-sm lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Chat list */}
      <aside className={cn("flex min-h-0 flex-col border-r", selected && "hidden lg:flex")}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h1 className="flex-1 font-display text-xl font-extrabold tracking-tight">Messages</h1>
          <Button variant="ghost" size="icon" onClick={() => setDialog("group")} aria-label="New group" title="New group">
            <Users />
          </Button>
          <Button variant="forge" size="icon" onClick={() => setDialog("direct")} aria-label="New chat" title="New chat">
            <MessageSquarePlus />
          </Button>
        </div>
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!isAdmin && admins.length > 0 && (
            <Button variant="outline" size="sm" className="w-full" onClick={messageAdmin}>
              <Shield /> Message an admin
            </Button>
          )}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              {convs.length ? "No chats match." : "No chats yet. Start one with the ✚ button."}
            </li>
          )}
          {shown.map((c) => {
            const ms = members[c.id] ?? [];
            const other = c.kind === "direct" ? otherMember(ms, meId) : null;
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => select(c.id)}
                  className={cn("flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-accent/60", active && "bg-accent")}
                >
                  {c.kind === "group" ? (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forge text-white"><Users className="h-5 w-5" /></span>
                  ) : (
                    <UserAvatar name={other?.full_name} src={other?.avatar_url} className="h-11 w-11" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-bold" : "font-medium")}>{conversationTitle(c, ms, meId)}</span>
                      {c.is_locked && <Lock className="h-3 w-3 shrink-0 text-destructive" aria-label="Blocked" />}
                      <span className={cn("ml-auto shrink-0 text-[11px]", c.unread ? "font-semibold text-primary" : "text-muted-foreground")}>
                        {listTime(c.last_message_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn("truncate text-xs", c.unread ? "text-foreground" : "text-muted-foreground")}>{previewText(c, meId)}</span>
                      {c.unread > 0 && (
                        <span className="ml-auto min-w-5 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="flex items-center gap-1.5 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Lab admins can view chats for moderation.
        </p>
      </aside>

      {/* Open chat */}
      {selected ? (
        <ChatThread
          key={selected.id}
          className="h-full"
          conversation={selected}
          members={members[selected.id] ?? []}
          people={people}
          meId={meId}
          isAdmin={isAdmin}
          onBack={() => select(null)}
          onChanged={refresh}
          onRemoved={() => {
            select(null);
            refresh();
          }}
        />
      ) : (
        <div className="hidden flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center lg:flex">
          <span className="rounded-2xl bg-forge p-4 text-white shadow-lg shadow-sky-500/20"><MessageCircle className="h-8 w-8" /></span>
          <p className="font-display text-lg font-bold">Lab messages</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Pick a chat on the left, or start a new one. You can paste screenshots, drop images and send PDFs or documents.
          </p>
          <div className="flex gap-2">
            <Button variant="forge" onClick={() => setDialog("direct")}><MessageSquarePlus /> New chat</Button>
            <Button variant="outline" onClick={() => setDialog("group")}><Users /> New group</Button>
          </div>
        </div>
      )}

      <NewChatDialog
        mode={dialog ?? "direct"}
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        people={contactable}
        onCreated={async (id) => {
          await refresh();
          select(id);
        }}
      />
    </div>
  );
}
