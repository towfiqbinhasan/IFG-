import { NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";
import { validatePassword } from "@/lib/auth";

const Body = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1),
});

/**
 * POST /api/account/change-password
 * - If the profile has must_change_password=true, current password is not required
 *   (the user just signed in with the temporary one).
 * - Otherwise the current password is verified first.
 * Then the password is set via the Admin API and the flag is cleared.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  const { currentPassword, newPassword } = parsed.data;

  const invalid = validatePassword(newPassword);
  if (invalid) return jsonError(invalid);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return jsonError("Not authenticated", 401);

  const { data: profile } = await supabase.from("profiles").select("must_change_password, is_active").eq("id", user.id).single();
  if (!profile || !profile.is_active) return jsonError("Account inactive", 403);

  if (!profile.must_change_password) {
    if (!currentPassword) return jsonError("Current password is required");
    // Verify with a throw-away, non-persisting client so we don't touch cookies.
    const verifier = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (error) return jsonError("Current password is incorrect", 403);
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (updErr) return jsonError(updErr.message, 500);

  const { error: flagErr } = await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  if (flagErr) return jsonError(flagErr.message, 500);

  return NextResponse.json({ ok: true });
}
