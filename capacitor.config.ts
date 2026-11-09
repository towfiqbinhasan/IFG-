import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the DEPLOYED web app (Vercel) in a native Android shell.
 * The app needs server-side API routes (admin user management) and live
 * Supabase data, so it loads the live URL instead of a static export.
 * Every web deploy updates the Android app instantly — no APK rebuild needed
 * unless you change native config, icons or splash.
 *
 * Set CAP_SERVER_URL before `npx cap sync android`, e.g.
 *   CAP_SERVER_URL=https://your-app.vercel.app npx cap sync android
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://your-app.vercel.app";

const config: CapacitorConfig = {
  appId: "com.researchlab.papertracker", // change before first Play Store upload; cannot change later
  appName: "Forge Lab",
  // Fallback bundle shown only if the remote URL cannot be reached.
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
    errorPath: "index.html",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
