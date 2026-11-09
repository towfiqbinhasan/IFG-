import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header, type DeadlineAlert } from "@/components/layout/header";
import { DEADLINE_FIELDS } from "@/lib/constants";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Authenticated shell. Enforces:
 *  - deactivated accounts are signed out
 *  - first-login users are forced to /change-password
 * and loads the deadline alerts for the notification bell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await getSessionProfile();
  if (!profile.is_active) redirect("/api/auth/signout?reason=inactive");
  if (profile.must_change_password) redirect("/change-password");

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const nowIso = now.toISOString();
  const in7Iso = in7.toISOString();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .or(
      `and(abstract_deadline.gte.${nowIso},abstract_deadline.lte.${in7Iso}),and(submission_deadline.gte.${nowIso},submission_deadline.lte.${in7Iso})`,
    );

  const alerts: DeadlineAlert[] = [];
  for (const v of (venues ?? []) as Venue[]) {
    for (const f of DEADLINE_FIELDS.slice(0, 2)) {
      const d = v[f.key];
      if (d && new Date(d) >= now && new Date(d) <= in7)
        alerts.push({ venueId: v.id, venueName: v.name, label: f.label, date: d });
    }
  }
  alerts.sort((a, b) => a.date.localeCompare(b.date));

  // Admins also get notified about pending "forgot password" requests.
  let resetRequestCount = 0;
  if (profile.role === "admin") {
    const { count } = await supabase
      .from("password_reset_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    resetRequestCount = count ?? 0;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header profile={profile} alerts={alerts} resetRequestCount={resetRequestCount} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav role={profile.role} />
    </div>
  );
}
