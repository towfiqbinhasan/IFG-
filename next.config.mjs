import { execSync } from "node:child_process";

/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "*.supabase.co";
  }
})();

// Identifies this build; the app compares it with /api/version to offer a reload after a deploy.
// Must be the same in every evaluation of this file during one build, so no timestamps.
const buildId = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
})();

const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // Lets a production preview build live next to a running `npm run dev`
  // (e.g. NEXT_DIST_DIR=.next-preview next build) without clobbering .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Avatars are served from Supabase Storage public bucket.
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
  async headers() {
    return [
      {
        // The service worker must never be cached by the browser/CDN.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
