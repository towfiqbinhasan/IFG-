import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

/** Forced first-login password change (also reachable manually). */
export default async function ChangePasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, must_change_password, is_active")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/api/auth/signout?reason=missing");
  if (!profile.is_active) redirect("/api/auth/signout?reason=inactive");

  return (
    <AuthBackdrop>
      <ChangePasswordForm
        username={profile.username}
        fullName={profile.full_name}
        forced={profile.must_change_password}
        variant="card"
      />
    </AuthBackdrop>
  );
}
