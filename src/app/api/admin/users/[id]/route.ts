import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, verifyAdmin } from "@/lib/api";
import { validatePassword } from "@/lib/auth";

const PatchBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_password"), password: z.string().min(1) }),
  z.object({ action: z.literal("set_active"), active: z.boolean() }),
  z.object({ action: z.literal("set_role"), role: z.enum(["admin", "member"]) }),
  z.object({
    action: z.literal("update_profile"),
    fullName: z.string().trim().min(1).max(120),
    researchArea: z.string().trim().max(200).nullable().optional(),
  }),
]);

type Admin = ReturnType<typeof createAdminClient>;

/** Prevent leaving the lab with zero active admins. */
async function isLastActiveAdmin(admin: Admin, id: string) {
  const { data } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
  return (data ?? []).length <= 1 && (data ?? []).some((p) => p.id === id);
}

/** PATCH /api/admin/users/:id — reset password, (de)activate, change role, edit details. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;
  const id = params.id;

  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  const body = parsed.data;
  const admin = createAdminClient();

  const { data: target } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!target) return jsonError("User not found", 404);

  switch (body.action) {
    case "reset_password": {
      const invalid = validatePassword(body.password);
      if (invalid) return jsonError(invalid);
      const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
      if (error) return jsonError(error.message, 500);
      await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
      // Close any open "forgot password" request for this user.
      await admin
        .from("password_reset_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: auth.profile.id })
        .eq("user_id", id)
        .eq("status", "pending");
      break;
    }
    case "set_active": {
      if (id === auth.profile.id && !body.active) return jsonError("You cannot deactivate your own account.");
      if (!body.active && target.role === "admin" && (await isLastActiveAdmin(admin, id)))
        return jsonError("Cannot deactivate the last active admin.");
      // Ban at the Auth level too, so a deactivated user cannot sign in or refresh tokens.
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: body.active ? "none" : "876000h" });
      if (error) return jsonError(error.message, 500);
      await admin.from("profiles").update({ is_active: body.active }).eq("id", id);
      break;
    }
    case "set_role": {
      if (id === auth.profile.id && body.role !== "admin") return jsonError("You cannot remove your own admin role.");
      if (body.role === "member" && (await isLastActiveAdmin(admin, id))) return jsonError("Cannot demote the last admin.");
      await admin.from("profiles").update({ role: body.role }).eq("id", id);
      break;
    }
    case "update_profile": {
      await admin.from("profiles").update({ full_name: body.fullName, research_area: body.researchArea || null }).eq("id", id);
      break;
    }
  }

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  return NextResponse.json({ profile });
}

/** Remove every object in `<bucket>/<userId>/...` (storage has no recursive delete). */
async function purgeUserFolder(admin: Admin, bucket: string, userId: string) {
  const paths: string[] = [];
  async function walk(prefix: string) {
    const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    for (const item of data ?? []) {
      const full = `${prefix}/${item.name}`;
      if (item.id) paths.push(full);
      else await walk(full); // folder
    }
  }
  await walk(userId);
  if (paths.length) await admin.storage.from(bucket).remove(paths);
}

/** DELETE /api/admin/users/:id — permanently delete the user, their papers and files. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;
  const id = params.id;
  if (id === auth.profile.id) return jsonError("You cannot delete your own account.");

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).single();
  if (!target) return jsonError("User not found", 404);
  if (target.role === "admin" && (await isLastActiveAdmin(admin, id))) return jsonError("Cannot delete the last admin.");

  await Promise.all([purgeUserFolder(admin, "avatars", id), purgeUserFolder(admin, "papers", id)]);

  // Cascades: auth.users -> profiles -> papers/paper_topics/submissions.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
