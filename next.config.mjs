/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "*.supabase.co";
  }
})();

const nextConfig = {
  reactStrictMode: true,
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
