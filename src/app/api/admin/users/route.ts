import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, verifyAdmin } from "@/lib/api";
import { USERNAME_REGEX, normalizeUsername, usernameToEmail, validatePassword } from "@/lib/auth";

const CreateBody = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  username: z.string().trim().min(1),
  password: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
  researchArea: z.string().trim().max(200).optional(),
});

/** POST /api/admin/users — create a member account (admin only). */
export async function POST(request: Request) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request");
  const { fullName, password, role, researchArea } = parsed.data;
  // Keep original case for display (e.g. Rahim.IFL.01); lowercase only for auth email.
  const username = parsed.data.username.trim();

  if (!USERNAME_REGEX.test(username))
    return jsonError("Username must be 3-32 characters: letters, numbers, dot, dash or underscore.");
  const invalid = validatePassword(password);
  if (invalid) return jsonError(invalid);

  const admin = createAdminClient();

  // Case-insensitive duplicate check.
  const { data: existing } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (existing) return jsonError("That username is already taken.", 409);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName },
  });
  if (error || !created.user) return jsonError(error?.message ?? "Could not create user", 500);

  // The auth trigger inserted the profile as 'member'; update with correct cased username + role.
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .update({ username, role, full_name: fullName, research_area: researchArea || null, must_change_password: true })
    .eq("id", created.user.id)
    .select("*")
    .single();
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back
    return jsonError(profErr.message, 500);
  }

  return NextResponse.json({ profile }, { status: 201 });
}
