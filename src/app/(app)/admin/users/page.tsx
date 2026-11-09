import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/lib/session";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireAdmin();
  const [{ data: users }, { data: papers }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("papers").select("user_id"),
  ]);
  const counts: Record<string, number> = {};
  for (const p of papers ?? []) counts[p.user_id] = (counts[p.user_id] ?? 0) + 1;
  return <UsersManager users={(users ?? []) as Profile[]} paperCounts={counts} currentUserId={profile.id} />;
}
