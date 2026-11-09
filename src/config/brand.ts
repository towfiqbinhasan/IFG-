/**
 * ============================================================
 *  BRANDING - the single place to customise name, logo & splash.
 *  See docs/BRANDING.md for step-by-step instructions.
 * ============================================================
 */
export const brand = {
  /** Shown in the header, login page, browser title and PWA. */
  appName: "The Intelligence Forge Lab",
  /** Short name for the PWA/home-screen icon label. */
  shortName: "Forge Lab",
  /** Two-line wordmark used next to the logo (sidebar, login, splash). */
  wordmark: { top: "The Intelligence Forge", bottom: "Lab" },
  tagline: "Paper Tracker",
  description: "Track the papers your research lab reads, the topics you cover and the deadlines you chase.",

  /** Path (inside /public) of the logo. Replace /public/logo.svg to change it everywhere. */
  logoSrc: "/logo.svg",
  /** Dark-mode version (emblem on a navy tile). Built by scripts/build-logo-dark.mjs. */
  logoDarkSrc: "/logo-dark.svg",
  /** High-res emblem (no tile) used by the splash animation. Built by scripts/build-logo.mjs. */
  emblemSrc: "/brand/emblem.png",

  /** Lab's local time zone - used for the dashboard greeting/date (servers run in UTC). */
  timeZone: "Asia/Dhaka",

  /** Theme colour used for the browser UI / Android status bar. */
  themeColor: "#0a2a5e",

  /**
   * Splash / loading animation.
   *  - "default": built-in animated logo (components/brand/splash-animation.tsx)
   *  - "image":   any image/GIF/animated SVG at `src`
   *  - "video":   an mp4/webm at `src` (muted, autoplay, plays once)
   *  - "custom":  edit components/brand/custom-splash.tsx (e.g. Lottie)
   */
  splash: {
    type: "default" as "default" | "image" | "video" | "custom",
    src: "/brand/splash.svg",
    /** Minimum time (ms) the splash stays visible on first app load. */
    minDurationMs: 2600,
    /** Show the splash only once per browser session (true) or on every full reload (false). */
    oncePerSession: true,
    background: "hsl(var(--background))",
  },
} as const;
