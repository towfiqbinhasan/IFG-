import { LabStats } from "@/components/members/lab-stats";
import { SettingsCard } from "@/components/admin/settings-card";
import { requireAdmin } from "@/lib/session";
import { loadLabStats } from "@/lib/lab-stats";

export const metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const [stats, { data: settings }, { count: pending }] = await Promise.all([
    loadLabStats(supabase),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("must_change_password", true),
  ]);
  return (
    <div className="space-y-6">
      {(pending ?? 0) > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {pending} account(s) still have a temporary password and haven&apos;t logged in to change it.
        </p>
      )}
      <SettingsCard allowMemberVenues={settings?.allow_member_venues ?? true} />
      <LabStats {...stats} />
    </div>
  );
}
