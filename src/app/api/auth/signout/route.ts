import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs the user out and redirects to /login (optionally with a reason). */
async function handler(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get("reason") ?? "signedout";
  const url = new URL("/login", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = handler;
export const POST = handler;
