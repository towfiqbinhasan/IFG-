import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/lib/session";
import type { PasswordResetRequest, Profile } from "@/lib/types";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireAdmin();
  const [{ data: users }, { data: papers }, { data: requests, error: requestsError }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("papers").select("user_id"),
    // Table comes from migration 002; if it isn't applied yet this just returns no rows.
    supabase.from("password_reset_requests").select("*").eq("status", "pending").order("created_at"),
  ]);
  const counts: Record<string, number> = {};
  for (const p of papers ?? []) counts[p.user_id] = (counts[p.user_id] ?? 0) + 1;
  return (
    <UsersManager
      users={(users ?? []) as Profile[]}
      paperCounts={counts}
      currentUserId={profile.id}
      resetRequests={(requests ?? []) as PasswordResetRequest[]}
      resetSetupMissing={requestsError?.code === "PGRST205" || requestsError?.code === "42P01"}
    />
  );
}
