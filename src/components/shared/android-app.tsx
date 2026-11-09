"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ifl-android-banner-dismissed";

/** True inside the Capacitor Android app (no point offering the APK there). */
function isNativeApp() {
  return typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

function useAndroidContext() {
  const [state, setState] = useState({ ready: false, native: false, android: false });
  useEffect(() => {
    setState({ ready: true, native: isNativeApp(), android: /android/i.test(navigator.userAgent) });
  }, []);
  return state;
}

/** "Download the Android app" link; hidden inside the app itself and when no APK URL is set. */
export function AndroidDownloadLink({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { ready, native } = useAndroidContext();
  if (!brand.androidApkUrl || !ready || native) return null;
  return (
    <a
      href={brand.androidApkUrl}
      download
      rel="noopener"
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        className,
      )}
    >
      <Smartphone className="h-4 w-4 text-primary" />
      <span className="flex-1 text-left">
        <span className="block text-foreground">Android app</span>
        {!compact && <span className="block text-[10px] text-muted-foreground">Download APK</span>}
      </span>
      <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
    </a>
  );
}

/**
 * On Android phones (in the browser, not in the app) a small banner offers the
 * APK. Dismissing it hides it for 14 days on this device.
 */
export function AndroidAppBanner() {
  const { ready, native, android } = useAndroidContext();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!ready || native || !android || !brand.androidApkUrl) return;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {
      /* storage blocked: just show it */
    }
    setHidden(Date.now() - dismissedAt < 14 * 86_400_000);
  }, [ready, native, android]);

  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="region"
      aria-label="Get the Android app"
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur-lg lg:bottom-6"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forge text-white">
        <Smartphone className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Get the Forge Lab app</span>
        <span className="block text-xs text-muted-foreground">Install the Android app for quicker access.</span>
      </span>
      <a
        href={brand.androidApkUrl}
        download
        rel="noopener"
        onClick={dismiss}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </a>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-muted-foreground hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
