import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * Current user + profile, memoised per request. Redirects when there is no
 * session. Used by layouts and pages inside the (app) group.
 */
export const getSessionProfile = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/api/auth/signout?reason=missing");

  return { supabase, user, profile: profile as Profile };
});

/** Same as getSessionProfile but also requires the admin role. */
export async function requireAdmin() {
  const ctx = await getSessionProfile();
  if (ctx.profile.role !== "admin") redirect("/dashboard");
  return ctx;
}
