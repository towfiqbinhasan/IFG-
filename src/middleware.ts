import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, images, PWA files and the logo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|brand/|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|mp4|webm)$).*)",
  ],
};
