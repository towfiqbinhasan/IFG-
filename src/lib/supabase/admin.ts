import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Shown to admins when the server's secret key is missing or wrong. */
export const SERVER_KEY_HELP =
  "Server setup problem: SUPABASE_SERVICE_ROLE_KEY must be your Supabase SECRET key (starts with sb_secret_, or the legacy service_role key) — not the publishable/anon key. Fix it in Vercel → Settings → Environment Variables (or .env.local), then redeploy/restart.";

/**
 * Service-role client. BYPASSES RLS. Server-only (the "server-only" import
 * makes the build fail if this file is ever imported into client code).
 * Use exclusively inside /api/* route handlers after verifying the caller.
 * Throws an Error with SERVER_KEY_HELP when the key is missing or is obviously
 * the public key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error(SERVER_KEY_HELP);
  if (key.startsWith("sb_publishable_") || key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error(SERVER_KEY_HELP);
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Turn Supabase "bad key" errors into an actionable message; pass others through. */
export function explainAdminError(message: string) {
  return /valid Bearer token|Invalid API key|invalid JWT|User not allowed|not_admin/i.test(message) ? SERVER_KEY_HELP : message;
}
