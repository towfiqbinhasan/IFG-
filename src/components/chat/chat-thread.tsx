"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Info,
  Lock,
  MoreVertical,
  Paperclip,
  SendHorizontal,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useNotifications } from "./notifications-provider";
import { GroupInfoDialog, type Person } from "./chat-dialogs";
import { createClient } from "@/lib/supabase/client";
import {
  CHAT_ACCEPT,
  CHAT_MAX_MB,
  chatObjectPath,
  conversationTitle,
  isAllowedChatFile,
  isImage,
  namePastedFile,
  otherMember,
  purgeConversationFiles,
} from "@/lib/chat";
import { cn, formatBytes } from "@/lib/utils";
import type { ConversationMember, ConversationSummary, Message } from "@/lib/types";

const PAGE = 200;

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

/** One conversation: header, message list (live), composer with paste / drop / attach. */
export function ChatThread({
  conversation,
  members,
  people,
  meId,
  isAdmin,
  onBack,
  onChanged,
  onRemoved,
  className,
}: {
  conversation: Pick<ConversationSummary, "id" | "kind" | "name" | "is_locked">;
  members: ConversationMember[];
  people: Person[];
  meId: string;
  isAdmin: boolean;
  onBack?: () => void;
  /** Conversation list should refresh (new message, rename, members...). */
  onChanged: () => void;
  /** The conversation was deleted or the user left it. */
  onRemoved: () => void;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { refreshUnread } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(conversation.is_locked);
  const [infoOpen, setInfoOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const isMember = members.some((m) => m.user_id === meId);
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m.profile])), [members]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const title = conversationTitle(conversation, members, meId);
  const other = conversation.kind === "direct" ? otherMember(members, meId) : null;
  const otherBlocked = conversation.kind === "direct" && other && peopleById[other.id]?.is_active === false;
  const canSend = isMember && !locked;

  useEffect(() => setLocked(conversation.is_locked), [conversation.is_locked]);

  const markRead = useCallback(async () => {
    if (!isMember) return;
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("user_id", meId);
    refreshUnread();
  }, [supabase, conversation.id, meId, isMember, refreshUnread]);

  /** Signed URLs for attachments we haven't resolved yet (private bucket). */
  const resolveUrls = useCallback(
    async (list: Message[]) => {
      const paths = list.map((m) => m.attachment_path).filter((p): p is string => !!p);
      if (!paths.length) return;
      const { data } = await supabase.storage.from("chat").createSignedUrls(paths, 60 * 60);
      if (!data) return;
      setUrls((u) => {
        const next = { ...u };
        for (const d of data) if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
        return next;
      });
    },
    [supabase],
  );

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (cancelled) return;
      if (error) toast.error(error.message);
      const list = ((data ?? []) as Message[]).reverse();
      setMessages(list);
      setLoading(false);
      resolveUrls(list);
      markRead();
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, conversation.id, resolveUrls, markRead]);

  // Live updates for this conversation.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
          resolveUrls([m]);
          if (m.sender_id !== meId && document.visibilityState === "visible") markRead();
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setMessages((list) => list.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversation.id, meId, markRead, resolveUrls]);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).map(namePastedFile);
    const ok: File[] = [];
    for (const f of incoming) {
      if (!isAllowedChatFile(f)) toast.error(`${f.name}: this file type can't be sent`);
      else if (f.size > CHAT_MAX_MB * 1024 * 1024) toast.error(`${f.name}: larger than ${CHAT_MAX_MB} MB`);
      else ok.push(f);
    }
    if (ok.length) setFiles((fs) => [...fs, ...ok].slice(0, 10));
    textarea.current?.focus();
  }

  async function send() {
    const body = text.trim();
    if ((!body && !files.length) || sending || !canSend) return;
    setSending(true);
    try {
      const rows: Partial<Message>[] = [];
      if (files.length) {
        for (const [i, f] of files.entries()) {
          const path = chatObjectPath(conversation.id, meId, f);
          const { error } = await supabase.storage.from("chat").upload(path, f, { contentType: f.type, upsert: false });
          if (error) throw error;
          rows.push({
            conversation_id: conversation.id,
            sender_id: meId,
            body: i === 0 && body ? body.slice(0, 4000) : null,
            attachment_path: path,
            attachment_name: f.name.slice(0, 200),
            attachment_type: f.type,
            attachment_size: f.size,
          });
        }
      } else {
        rows.push({ conversation_id: conversation.id, sender_id: meId, body: body.slice(0, 4000) });
      }
      const { data, error } = await supabase.from("messages").insert(rows).select("*");
      if (error) throw error;
      const added = (data ?? []) as Message[];
      setMessages((list) => [...list, ...added.filter((m) => !list.some((x) => x.id === m.id))]);
      resolveUrls(added);
      setText("");
      setFiles([]);
      onChanged();
    } catch (err) {
      const e = err as { message?: string; code?: string };
      toast.error(
        e.code === "42501" || /row-level security/i.test(e.message ?? "")
          ? "You can't send messages here (the chat is locked or you are no longer a member)."
          : e.message ?? "Could not send",
      );
    } finally {
      setSending(false);
      textarea.current?.focus();
    }
  }

  async function removeMessage(m: Message) {
    if (m.attachment_path) await supabase.storage.from("chat").remove([m.attachment_path]);
    const { error } = await supabase.from("messages").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    setMessages((list) => list.filter((x) => x.id !== m.id));
    onChanged();
  }

  async function setLock(next: boolean) {
    const { error } = await supabase.from("conversations").update({ is_locked: next }).eq("id", conversation.id);
    if (error) return toast.error(error.message);
    setLocked(next);
    toast.success(next ? "Chat blocked — nobody can send messages" : "Chat unblocked");
    onChanged();
  }

  async function deleteConversation() {
    // Remove attachments first (storage has no cascade).
    await purgeConversationFiles(supabase, conversation.id);
    const { error } = await supabase.from("conversations").delete().eq("id", conversation.id);
    if (error) return toast.error(error.message);
    toast.success("Chat deleted");
    onRemoved();
  }

  // Group consecutive messages by sender (within 5 minutes) and split by day.
  const rendered = messages.map((m, i) => {
    const prev = messages[i - 1];
    const d = new Date(m.created_at);
    const newDay = !prev || new Date(prev.created_at).toDateString() !== d.toDateString();
    const grouped = !newDay && prev?.sender_id === m.sender_id && d.getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
    return { m, d, newDay, grouped };
  });

  return (
    <section
      className={cn("relative flex min-h-0 flex-col", className)}
      onDragOver={(e) => {
        if (!canSend || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (!canSend) return;
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        {onBack && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to chats">
            <ArrowLeft />
          </Button>
        )}
        {conversation.kind === "group" ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forge text-white"><Users className="h-5 w-5" /></span>
        ) : (
          <UserAvatar name={other?.full_name ?? title} src={other?.avatar_url} className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-semibold">
            {title}
            {locked && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" />Blocked</Badge>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.kind === "group"
              ? members.map((m) => (m.user_id === meId ? "You" : m.profile?.full_name?.split(" ")[0])).filter(Boolean).join(", ")
              : otherBlocked
                ? "This account is blocked"
                : other
                  ? `@${other.username}`
                  : ""}
          </p>
        </div>
        {conversation.kind === "group" && (
          <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} aria-label="Group info" title="Group info">
            <Info />
          </Button>
        )}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Admin actions" title="Admin actions"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setLock(!locked)}>
                {locked ? <><Unlock /> Unblock chat</> : <><Lock /> Block chat</>}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
                <Trash2 /> Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Messages */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
        ) : (
          rendered.map(({ m, d, newDay, grouped }) => {
            const mine = m.sender_id === meId;
            const sender = (m.sender_id && (byId[m.sender_id] ?? peopleById[m.sender_id])) || null;
            const url = m.attachment_path ? urls[m.attachment_path] : undefined;
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">{dayLabel(d)}</span>
                  </div>
                )}
                <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", !grouped && "mt-2")}>
                  {!mine && conversation.kind === "group" && (
                    <span className="w-7 shrink-0">
                      {!grouped && <UserAvatar name={sender?.full_name} src={sender?.avatar_url} className="h-7 w-7 text-[10px]" />}
                    </span>
                  )}
                  {mine && <MessageMenu m={m} url={url} canDelete onDelete={() => removeMessage(m)} />}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[65%]",
                      mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card",
                    )}
                  >
                    {!mine && conversation.kind === "group" && !grouped && (
                      <p className="mb-0.5 text-xs font-semibold text-primary">{sender?.full_name ?? "Former member"}</p>
                    )}
                    {m.attachment_path && (
                      <Attachment m={m} url={url} mine={mine} />
                    )}
                    {m.body && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>}
                    <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(d, "HH:mm")}
                    </p>
                  </div>
                  {!mine && <MessageMenu m={m} url={url} canDelete={isAdmin} onDelete={() => removeMessage(m)} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {canSend ? (
        <div className="border-t bg-card p-2 sm:p-3">
          {files.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border bg-background py-1 pl-1 pr-2 text-xs">
                  <FilePreview file={f} />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                  <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="rounded p-0.5 hover:bg-accent">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => fileInput.current?.click()} aria-label="Attach files" title="Attach images, PDFs or documents">
              <Paperclip />
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={CHAT_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Textarea
              ref={textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const pasted = Array.from(e.clipboardData.files);
                if (pasted.length) {
                  e.preventDefault();
                  addFiles(pasted);
                }
              }}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter = new line. Ignore Enter while an IME (e.g. Bangla) is composing.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Type a message — paste or drop images and files here"
              className="max-h-40 min-h-10 flex-1 resize-none py-2.5"
            />
            <Button variant="forge" size="icon" onClick={send} loading={sending} disabled={!text.trim() && !files.length} aria-label="Send">
              {!sending && <SendHorizontal />}
            </Button>
          </div>
          <p className="mt-1 hidden px-12 text-[11px] text-muted-foreground sm:block">Enter to send · Shift + Enter for a new line · up to {CHAT_MAX_MB} MB per file</p>
        </div>
      ) : (
        <div className="border-t bg-card p-4 text-center text-sm text-muted-foreground">
          {locked ? (
            <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4" /> An admin has blocked this chat. No new messages can be sent.</span>
          ) : (
            "You are viewing this chat as an admin. Only members can send messages."
          )}
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 text-sm font-semibold text-primary">
          Drop files to attach
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>All messages and files in “{title}” are permanently deleted for everyone. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                await deleteConversation();
                setDeleting(false);
                setConfirmDelete(false);
              }}
            >
              Delete chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {conversation.kind === "group" && (
        <GroupInfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          conversation={conversation}
          members={members}
          people={people}
          meId={meId}
          isAdmin={isAdmin}
          onChanged={onChanged}
          onLeft={onRemoved}
        />
      )}
    </section>
  );
}

function FilePreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage(file.type)) return;
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return src ? (
    <span className="relative h-8 w-8 overflow-hidden rounded">
      <Image src={src} alt="" fill unoptimized className="object-cover" />
    </span>
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded bg-muted"><FileText className="h-4 w-4" /></span>
  );
}

function Attachment({ m, url, mine }: { m: Message; url?: string; mine: boolean }) {
  if (isImage(m.attachment_type)) {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block overflow-hidden rounded-lg" title="Open full size">
        <Image src={url} alt={m.attachment_name ?? "image"} width={480} height={360} unoptimized className="h-auto max-h-80 w-auto max-w-full object-contain" />
      </a>
    ) : (
      <div className="mb-1 h-40 w-56 animate-pulse rounded-lg bg-muted" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("mb-1 flex items-center gap-3 rounded-lg p-2", mine ? "bg-primary-foreground/15" : "bg-muted", !url && "pointer-events-none opacity-60")}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", mine ? "bg-primary-foreground/20" : "bg-background")}>
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{m.attachment_name}</span>
        <span className={cn("block text-xs", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {(m.attachment_type === "application/pdf" ? "PDF · " : "") + formatBytes(m.attachment_size)}
        </span>
      </span>
      <Download className="ml-auto h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}

function MessageMenu({ m, url, canDelete, onDelete }: { m: Message; url?: string; canDelete: boolean; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="self-center rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent focus:opacity-100 group-hover:opacity-100" aria-label="Message actions">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44">
        {m.body && (
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard?.writeText(m.body ?? "");
              toast.success("Copied");
            }}
          >
            <Copy /> Copy text
          </DropdownMenuItem>
        )}
        {url && (
          <DropdownMenuItem asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" download={m.attachment_name ?? undefined}>
              <Download /> Open / download
            </a>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
