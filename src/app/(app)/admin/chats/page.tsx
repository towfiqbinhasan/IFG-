import { MessageCircle } from "lucide-react";
import { ChatsModeration, type AdminConversation } from "@/components/admin/chats-moderation";
import type { Person } from "@/components/chat/chat-dialogs";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin · Chats" };

export default async function AdminChatsPage() {
  const { supabase, profile } = await requireAdmin();
  const [{ data, error }, { data: people }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, kind, name, is_locked, created_by, last_message_at, created_at, members:conversation_members(conversation_id, user_id, role, last_read_at, profile:profiles(id, username, full_name, avatar_url, is_active, role)), messages(count)",
      )
      .order("last_message_at", { ascending: false }),
    supabase.from("profiles").select("id, username, full_name, avatar_url, role, is_active").order("full_name"),
  ]);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Chat isn&apos;t set up yet.</strong> Run{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">supabase/migrations/005_posters_and_chat.sql</code> once in the Supabase SQL Editor.
        </p>
      </div>
    );
  }

  return <ChatsModeration conversations={(data ?? []) as unknown as AdminConversation[]} people={(people ?? []) as Person[]} meId={profile.id} />;
}
