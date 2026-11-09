import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationMember, ConversationSummary, Message, ProfileLite } from "./types";

/** Files the chat accepts (must match the 'chat' bucket in migration 005). */
export const CHAT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/zip," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const CHAT_MAX_MB = 25;

export function isAllowedChatFile(f: File) {
  return CHAT_ACCEPT.split(",").includes(f.type);
}

export function isImage(type?: string | null) {
  return !!type && type.startsWith("image/");
}

export type MemberMap = Record<string, ConversationMember[]>;

/** conversation_members with the member's profile joined. */
export const MEMBER_SELECT =
  "conversation_id, user_id, role, last_read_at, profile:profiles(id, username, full_name, avatar_url, is_active, role)";

export function groupMembers(rows: ConversationMember[]): MemberMap {
  const map: MemberMap = {};
  for (const r of rows) (map[r.conversation_id] ??= []).push(r);
  return map;
}

/** Display title: group name, or the other person's name for a direct chat. */
export function conversationTitle(c: Pick<ConversationSummary, "kind" | "name">, members: ConversationMember[], meId: string) {
  if (c.kind === "group") return c.name || "Group";
  const other = members.find((m) => m.user_id !== meId)?.profile;
  return other?.full_name || other?.username || "Direct message";
}

/** The other person in a direct chat (for the avatar). */
export function otherMember(members: ConversationMember[], meId: string): ProfileLite | null {
  return members.find((m) => m.user_id !== meId)?.profile ?? null;
}

/** One-line preview of the last message. */
export function previewText(c: Pick<ConversationSummary, "last_body" | "last_attachment_name" | "last_sender_id">, meId: string) {
  const who = c.last_sender_id === meId ? "You: " : "";
  if (c.last_body) return who + mentionsToText(c.last_body).replace(/\s+/g, " ");
  if (c.last_attachment_name) return `${who}📎 ${c.last_attachment_name}`;
  return "No messages yet";
}

export function messagePreview(m: Pick<Message, "body" | "attachment_name">) {
  return (m.body && mentionsToText(m.body).replace(/\s+/g, " ")) || (m.attachment_name ? `📎 ${m.attachment_name}` : "New message");
}

/** Safe storage object name for an uploaded chat file. */
export function chatObjectPath(conversationId: string, userId: string, file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (file.name.replace(/\.[^.]+$/, "") || "file").replace(/[^\w.-]+/g, "_").slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${conversationId}/${userId}/${Date.now()}-${rand}-${base}${ext ? `.${ext}` : ""}`;
}

/** Name for a pasted screenshot (clipboard images are usually called "image.png"). */
export function namePastedFile(f: File) {
  if (f.name && f.name !== "image.png") return f;
  const ext = f.type.split("/")[1] || "png";
  return new File([f], `pasted-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`, { type: f.type });
}

/** Delete every attachment stored under chat/<conversationId>/<sender>/... (storage has no cascade). */
export async function purgeConversationFiles(supabase: SupabaseClient, conversationId: string) {
  const bucket = supabase.storage.from("chat");
  const { data: senders } = await bucket.list(conversationId, { limit: 1000 });
  const paths: string[] = [];
  for (const folder of senders ?? []) {
    if (folder.id) {
      paths.push(`${conversationId}/${folder.name}`);
      continue;
    }
    const { data: files } = await bucket.list(`${conversationId}/${folder.name}`, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${conversationId}/${folder.name}/${f.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
}

/* ---------------- @mentions ----------------
 * Stored in the message body as  @[Display Name](<user uuid>)  or  @[everyone](all),
 * so a mention keeps pointing at the right person even if they rename themselves.
 * Everywhere text is shown, tokens render as "@Display Name".
 */
export const EVERYONE = "all";
const MENTION_RE = /@\[([^\]\n]{1,80})\]\(([0-9a-f-]{36}|all)\)/g;

export type BodyPart = { text: string } | { mention: string; id: string };

/** Split a body into plain text and mention parts (for rendering). */
export function parseMentions(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    if (m.index! > last) parts.push({ text: body.slice(last, m.index) });
    parts.push({ mention: m[1]!, id: m[2]! });
    last = m.index! + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

/** "@[Nusrat](uuid) hi" -> "@Nusrat hi" */
export function mentionsToText(body: string) {
  return body.replace(MENTION_RE, (_, name) => `@${name}`);
}

/** True if the body mentions this user directly or via @everyone. */
export function mentionsUser(body: string | null | undefined, userId: string) {
  if (!body) return false;
  for (const m of body.matchAll(MENTION_RE)) if (m[2] === userId || m[2] === EVERYONE) return true;
  return false;
}

/** Name safe to put inside a token (no brackets / newlines). */
export function mentionLabel(name: string) {
  return name.replace(/[[\]\n]/g, "").trim().slice(0, 80) || "member";
}

/**
 * Turn the composer's readable "@Name" text into tokens, using the mentions the
 * user actually picked from the list (longest names first so "@Nusrat Jahan"
 * wins over "@Nusrat").
 */
export function encodeMentions(text: string, picked: { label: string; id: string }[]) {
  const unique = Array.from(new Map(picked.map((p) => [p.label, p])).values()).sort((a, b) => b.label.length - a.label.length);
  let out = text;
  for (const p of unique) {
    const esc = p.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(^|[^\\w@])@${esc}(?![\\w])`, "g"), (_, pre) => `${pre}@[${p.label}](${p.id})`);
  }
  return out;
}
