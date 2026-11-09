"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Copy,
  KeyRound,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { UserAvatar } from "@/components/shared/user-avatar";
import { generateTempPassword } from "@/lib/utils";
import { USERNAME_REGEX, normalizeUsername, generateIFLUsername } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type { PasswordResetRequest, Profile } from "@/lib/types";

type Counts = Record<string, number>;

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

/** Admin user management: create, reset password, (de)activate, role, edit, delete. */
export function UsersManager({
  users,
  paperCounts,
  currentUserId,
  resetRequests = [],
  resetSetupMissing = false,
}: {
  users: Profile[];
  paperCounts: Counts;
  currentUserId: string;
  resetRequests?: PasswordResetRequest[];
  /** True when supabase/migrations/002 hasn't been run (table missing). */
  resetSetupMissing?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string; title: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => !s || `${u.full_name} ${u.username} ${u.research_area ?? ""}`.toLowerCase().includes(s));
  }, [users, q]);

  /** Runs an admin action with busy state + toasts. Resolves true on success. */
  async function run(id: string, fn: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(id);
    try {
      await fn();
      toast.success(success);
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(u: Profile) {
    const password = generateTempPassword();
    const ok = await run(u.id, () => api(`/api/admin/users/${u.id}`, "PATCH", { action: "reset_password", password }), "Password reset");
    // Only show credentials that were actually applied.
    if (ok) setCredentials({ username: u.username, password, title: "Temporary password reset" });
  }

  async function dismissRequest(id: string) {
    await run(
      id,
      async () => {
        const { error } = await createClient()
          .from("password_reset_requests")
          .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: currentUserId })
          .eq("id", id);
        if (error) throw error;
      },
      "Request dismissed",
    );
  }

  return (
    <div className="space-y-4">
      {resetSetupMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>“Forgot password” isn&apos;t set up yet.</strong> Run{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">supabase/migrations/002_password_reset_requests.sql</code>{" "}
            once in the Supabase SQL Editor so members&apos; reset requests can reach you.
          </p>
        </div>
      )}

      {/* "Forgot password" requests from the login page */}
      <AnimatePresence initial={false}>
        {resetRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <Card className="overflow-hidden border-amber-300/70 dark:border-amber-700/60">
              <div className="flex items-center gap-2 border-b border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                <KeyRound className="h-4 w-4" />
                Password reset requests
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{resetRequests.length}</span>
              </div>
              <div className="divide-y">
                {resetRequests.map((r) => {
                  const u = users.find((x) => x.id === r.user_id);
                  return (
                    <div key={r.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <UserAvatar name={u?.full_name ?? r.username} src={u?.avatar_url} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {u?.full_name ?? r.username}{" "}
                            <span className="text-xs font-normal text-muted-foreground">@{r.username}</span>
                            {u && !u.is_active && <Badge variant="destructive" className="ml-1.5">Deactivated</Badge>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Asked {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            {r.note ? ` · “${r.note}”` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="ghost" size="sm" onClick={() => dismissRequest(r.id)} disabled={busy === r.id}>
                          Dismiss
                        </Button>
                        {u && (
                          <Button size="sm" variant="forge" loading={busy === u.id} onClick={() => resetPassword(u)}>
                            <KeyRound /> Reset password
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setCreateOpen(true)}><UserPlus /> Create user</Button>
      </div>

      <Card className="divide-y overflow-hidden">
        {list.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: Math.min(i, 15) * 0.02 } }}
            className={`flex items-center gap-3 p-3 sm:p-4 ${!u.is_active ? "opacity-60" : ""}`}
          >
            <UserAvatar name={u.full_name} src={u.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-medium">
                <span className="truncate">{u.full_name}</span>
                {u.role === "admin" && <Badge variant="secondary"><Shield className="h-3 w-3" />Admin</Badge>}
                {!u.is_active && <Badge variant="destructive">Deactivated</Badge>}
                {u.must_change_password && u.is_active && <Badge variant="outline">Temp password</Badge>}
                {u.id === currentUserId && <Badge variant="outline">You</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{u.username} · {paperCounts[u.id] ?? 0} papers · joined {format(new Date(u.joined_at), "MMM yyyy")}
                {u.research_area ? ` · ${u.research_area}` : ""}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" loading={busy === u.id} aria-label={`Actions for ${u.username}`}>
                  {busy !== u.id && <MoreVertical />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setEditing(u)}><Pencil /> Edit details</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => resetPassword(u)}><KeyRound /> Reset password</DropdownMenuItem>
                {u.id !== currentUserId && (
                  <>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(u.id, () => api(`/api/admin/users/${u.id}`, "PATCH", { action: "set_role", role: u.role === "admin" ? "member" : "admin" }), "Role updated")
                      }
                    >
                      {u.role === "admin" ? <><ShieldOff /> Make member</> : <><Shield /> Make admin</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(u.id, () => api(`/api/admin/users/${u.id}`, "PATCH", { action: "set_active", active: !u.is_active }), u.is_active ? "User deactivated" : "User reactivated")
                      }
                    >
                      {u.is_active ? <><UserX /> Deactivate</> : <><UserCheck /> Reactivate</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(u)}>
                      <Trash2 /> Delete user
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ))}
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users match.</p>}
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        memberCount={users.filter((u) => u.role !== "admin").length}
        onCreated={(username, password) => {
          setCredentials({ username, password, title: "Account created" });
          router.refresh();
        }}
      />
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />}

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.full_name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the account, all {paperCounts[deleting?.id ?? ""] ?? 0} of their papers, submissions, avatar and PDFs. Consider deactivating instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={busy === deleting?.id}
              onClick={async () => {
                const u = deleting!;
                await run(u.id, () => api(`/api/admin/users/${u.id}`, "DELETE"), "User deleted");
                setDeleting(null);
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time credentials display */}
      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{credentials?.title}</DialogTitle>
            <DialogDescription>Share these credentials securely. The user must choose a new password on next login. This password is not shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-muted p-4 font-mono text-sm">
            <p>Username: <strong>{credentials?.username}</strong></p>
            <p>Password: <strong>{credentials?.password}</strong></p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(`Username: ${credentials?.username}\nTemporary password: ${credentials?.password}`);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy /> Copy
            </Button>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  memberCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (username: string, password: string) => void;
  memberCount: number;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(() => generateTempPassword());
  const [role, setRole] = useState<"member" | "admin">("member");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function suggestUsername(name: string) {
    if (!name.trim()) return "";
    return generateIFLUsername(name, memberCount + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const u = username.trim();
    if (!fullName.trim()) return setError("Full name is required.");
    if (!USERNAME_REGEX.test(u)) return setError("Username: 3–32 chars, letters, numbers, . _ -");
    setSaving(true);
    try {
      await api("/api/admin/users", "POST", { fullName, username: u, password, role, researchArea: area });
      toast.success(`Created @${u}`);
      onOpenChange(false);
      onCreated(u, password);
      setFullName("");
      setUsername("");
      setArea("");
      setRole("member");
      setPassword(generateTempPassword());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an IFL account</DialogTitle>
          <DialogDescription>Username is auto-generated as Name.IFL.Number. The member must change the temporary password on first login.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" required>
            <Input
              value={fullName}
              onChange={(e) => {
                const wasSuggested = !username || username === suggestUsername(fullName);
                setFullName(e.target.value);
                if (wasSuggested) setUsername(suggestUsername(e.target.value));
              }}
              placeholder="Rahim Uddin"
            />
          </Field>
          <Field label="Username" required hint="Auto-generated: Name.IFL.Number">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Rahim.IFL.01" />
          </Field>
          <Field label="Temporary password" required>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generateTempPassword())} aria-label="Generate password">
                <RefreshCw />
              </Button>
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Research area">
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onSaved }: { user: Profile; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [area, setArea] = useState(user.research_area ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/users/${user.id}`, "PATCH", { action: "update_profile", fullName, researchArea: area || null });
      toast.success("User updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit @{user.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" required><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Research area"><Input value={area} onChange={(e) => setArea(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
