import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { SERVER_KEY_HELP, createAdminClient, explainAdminError } from "./supabase/admin";
import type { Profile } from "./types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Verifies the caller of an API route is a signed-in, active admin.
 * Returns the caller profile or a ready-to-return error response.
 */
export async function verifyAdmin(): Promise<{ profile: Profile } | { error: NextResponse }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError("Not authenticated", 401) };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: jsonError("Admin access required", 403) };
  }
  return { profile: profile as Profile };
}

/** Service-role client, or a ready-to-return error response with setup help. */
export function getAdminClient():
  | { admin: ReturnType<typeof createAdminClient>; error?: undefined }
  | { error: NextResponse; admin?: undefined } {
  try {
    return { admin: createAdminClient() };
  } catch (e) {
    return { error: jsonError((e as Error).message, 500) };
  }
}

/**
 * Checks the server's secret key actually works (admin API reachable).
 * Returns a human-readable problem, or null when everything is fine.
 */
export async function serverKeyProblem(): Promise<string | null> {
  const ac = getAdminClient();
  if (ac.error) return SERVER_KEY_HELP;
  const { error } = await ac.admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  return error ? explainAdminError(error.message) : null;
}
