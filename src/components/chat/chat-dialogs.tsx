"use client";

import { useMemo, useState } from "react";
import { Check, LogOut, Search, Shield, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ConversationMember, ConversationSummary, ProfileLite, Role } from "@/lib/types";

export type Person = ProfileLite & { role: Role; is_active: boolean };

/** Searchable list of people; single-click (direct) or multi-select (group). */
function PeoplePicker({
  people,
  selected,
  onToggle,
  multi,
}: {
  people: Person[];
  selected: string[];
  onToggle: (id: string) => void;
  multi: boolean;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return people
      .filter((p) => !s || `${p.full_name} ${p.username}`.toLowerCase().includes(s))
      .sort((a, b) => (a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "admin" ? -1 : 1));
  }, [people, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <ul className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border p-1">
        {list.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No one found</li>}
        {list.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                className={cn("flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent", on && multi && "bg-primary/10")}
              >
                <UserAvatar name={p.full_name} src={p.avatar_url} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {p.full_name}
                    {p.role === "admin" && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]"><Shield className="h-2.5 w-2.5" />Admin</Badge>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                </span>
                {multi && (
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Start a 1:1 chat or create a group. */
export function NewChatDialog({
  mode,
  open,
  onOpenChange,
  people,
  onCreated,
}: {
  mode: "direct" | "group";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  people: Person[];
  onCreated: (conversationId: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function startDirect(id: string) {
    setBusy(true);
    const { data, error } = await createClient().rpc("start_direct_chat", { p_other: id });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not start the chat");
    onOpenChange(false);
    onCreated(data as string);
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the group a name");
    if (!selected.length) return toast.error("Add at least one person");
    setBusy(true);
    const { data, error } = await createClient().rpc("create_group", { p_name: name.trim(), p_members: selected });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not create the group");
    toast.success(`Group “${name.trim()}” created`);
    setName("");
    setSelected([]);
    onOpenChange(false);
    onCreated(data as string);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "direct" ? "New chat" : "New group"}</DialogTitle>
          <DialogDescription>
            {mode === "direct" ? "Pick someone to message. Admins are listed first." : "Name the group and choose its members. You'll be the group owner."}
          </DialogDescription>
        </DialogHeader>
        {mode === "direct" ? (
          <div className={cn(busy && "pointer-events-none opacity-60")}>
            <PeoplePicker people={people} selected={[]} onToggle={startDirect} multi={false} />
          </div>
        ) : (
          <form onSubmit={createGroup} className="space-y-4">
            <Field label="Group name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NLP reading group" maxLength={80} />
            </Field>
            <Field label={`Members (${selected.length} selected)`}>
              <PeoplePicker
                people={people}
                selected={selected}
                multi
                onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant="forge" loading={busy}>Create group</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Group members, rename, add/remove people, leave. */
export function GroupInfoDialog({
  open,
  onOpenChange,
  conversation,
  members,
  people,
  meId,
  isAdmin,
  onChanged,
  onLeft,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conversation: Pick<ConversationSummary, "id" | "name">;
  members: ConversationMember[];
  people: Person[];
  meId: string;
  isAdmin: boolean;
  onChanged: () => void;
  onLeft: () => void;
}) {
  const me = members.find((m) => m.user_id === meId);
  const canManage = me?.role === "owner" || isAdmin;
  const [name, setName] = useState(conversation.name ?? "");
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const outside = people.filter((p) => !members.some((m) => m.user_id === p.id));

  async function call(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(true);
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(ok);
    onChanged();
    return true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group info</DialogTitle>
          <DialogDescription>{members.length} member{members.length === 1 ? "" : "s"}</DialogDescription>
        </DialogHeader>

        {canManage && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              call("rename_group", { p_conversation: conversation.id, p_name: name }, "Group renamed");
            }}
          >
            <Field label="Group name" className="flex-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Button type="submit" variant="outline" disabled={busy || !name.trim() || name.trim() === conversation.name}>Rename</Button>
          </form>
        )}

        {adding ? (
          <div className="space-y-3">
            <PeoplePicker
              people={outside}
              selected={toAdd}
              multi
              onToggle={(id) => setToAdd((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button
                variant="forge"
                loading={busy}
                disabled={!toAdd.length}
                onClick={async () => {
                  if (await call("add_group_members", { p_conversation: conversation.id, p_members: toAdd }, "Members added")) {
                    setToAdd([]);
                    setAdding(false);
                  }
                }}
              >
                Add {toAdd.length || ""}
              </Button>
            </div>
          </div>
        ) : (
          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 rounded-md p-2">
                <UserAvatar name={m.profile?.full_name} src={m.profile?.avatar_url} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.profile?.full_name ?? "Former member"} {m.user_id === meId && <span className="text-muted-foreground">(you)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">@{m.profile?.username}</span>
                </span>
                {m.role === "owner" && <Badge variant="outline">Owner</Badge>}
                {canManage && m.user_id !== meId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.profile?.full_name}`}
                    disabled={busy}
                    onClick={() => call("remove_group_member", { p_conversation: conversation.id, p_user: m.user_id }, "Removed from group")}
                  >
                    <UserMinus />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!adding && (
          <DialogFooter className="gap-2 sm:justify-between">
            {me ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Leave this group? You won't see new messages.")) return;
                  if (await call("remove_group_member", { p_conversation: conversation.id, p_user: meId }, "You left the group")) {
                    onOpenChange(false);
                    onLeft();
                  }
                }}
              >
                <LogOut /> Leave group
              </Button>
            ) : (
              <span />
            )}
            {canManage && (
              <Button variant="outline" onClick={() => setAdding(true)} disabled={!outside.length}>
                <UserPlus /> Add people
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
