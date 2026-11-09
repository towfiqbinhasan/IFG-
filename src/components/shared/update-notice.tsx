"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CHECK_EVERY_MS = 5 * 60_000;

/**
 * After a new deploy, an already-open tab keeps running the old code until a
 * full reload. This compares the running build with the deployed one (on tab
 * focus and every 5 minutes) and offers a one-click reload.
 */
export function UpdateNotice() {
  const shown = useRef(false);

  useEffect(() => {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!current) return;

    async function check() {
      if (shown.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string | null };
        if (id && id !== current) {
          shown.current = true;
          toast("A new version of the app is available", {
            id: "app-update",
            description: "Reload to get the latest features and fixes.",
            duration: Infinity,
            action: { label: "Reload", onClick: () => window.location.reload() },
          });
        }
      } catch {
        /* offline: try again later */
      }
    }

    const t = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
