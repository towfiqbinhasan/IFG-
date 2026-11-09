import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";
import { normalizeUsername } from "@/lib/auth";

const Body = z.object({
  username: z.string().trim().min(1).max(64),
  note: z.string().trim().max(300).optional(),
});

/**
 * POST /api/auth/forgot-password  (public)
 * Records a "forgot password" request for the lab admin.
 *  - Always answers the same way, so it can't be used to discover usernames.
 *  - Only stores requests for usernames that exist (no junk rows).
 *  - One pending request per username (unique partial index).
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your username.");

  const username = normalizeUsername(parsed.data.username);
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (profile) {
    const { error } = await admin
      .from("password_reset_requests")
      .insert({ username, user_id: profile.id, note: parsed.data.note || null });
    // 23505 = a pending request already exists -> fine, admin already notified.
    // PGRST205 / 42P01 = table missing: supabase/migrations/002 hasn't been run yet.
    if (error && (error.code === "PGRST205" || error.code === "42P01")) {
      console.error("forgot-password: run supabase/migrations/002_password_reset_requests.sql");
      return jsonError("Password reset requests aren't set up yet. Please contact your lab admin directly.", 503);
    }
    if (error && error.code !== "23505") {
      console.error("forgot-password insert failed", error);
      return jsonError("Could not send the request. Please try again or contact your admin.", 500);
    }
  }

  return NextResponse.json({ ok: true });
}
