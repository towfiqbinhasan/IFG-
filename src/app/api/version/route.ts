import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/version — id of the build currently deployed (see next.config.mjs). */
export function GET() {
  return NextResponse.json({ id: process.env.NEXT_PUBLIC_BUILD_ID ?? null }, { headers: { "Cache-Control": "no-store" } });
}
