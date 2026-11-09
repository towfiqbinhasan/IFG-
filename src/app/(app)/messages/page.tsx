import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatApp } from "@/components/chat/chat-app";
import { MEMBER_SELECT, groupMembers } from "@/lib/chat";
import type { Person } from "@/components/chat/chat-dialogs";
import { getSessionProfile } from "@/lib/session";
import type { ConversationMember, ConversationSummary } from "@/lib/types";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: { c?: string; to?: string } }) {
  const { supabase, profile } = await getSessionProfile();

  // /messages?to=<userId> opens (or creates) the 1:1 chat with that person.
  if (searchParams.to && searchParams.to !== profile.id) {
    const { data } = await supabase.rpc("start_direct_chat", { p_other: searchParams.to });
    if (data) redirect(`/messages?c=${data}`);
  }

  const [{ data: convs, error }, { data: people }] = await Promise.all([
    supabase.rpc("my_conversations"),
    supabase.from("profiles").select("id, username, full_name, avatar_url, role, is_active").order("full_name"),
  ]);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Messages aren&apos;t set up yet.</strong> An admin needs to run{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">supabase/migrations/005_posters_and_chat.sql</code> once in the Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const list = (convs ?? []) as ConversationSummary[];
  const ids = list.map((c) => c.id);
  const { data: memberRows } = ids.length
    ? await supabase.from("conversation_members").select(MEMBER_SELECT).in("conversation_id", ids)
    : { data: [] };

  return (
    <ChatApp
      meId={profile.id}
      isAdmin={profile.role === "admin"}
      initialConversations={list}
      initialMembers={groupMembers((memberRows ?? []) as unknown as ConversationMember[])}
      people={(people ?? []) as Person[]}
    />
  );
}
