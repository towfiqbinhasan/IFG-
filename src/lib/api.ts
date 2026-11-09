import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
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
