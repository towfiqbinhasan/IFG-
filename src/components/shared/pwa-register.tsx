"use client";

import { useEffect } from "react";

/** Registers /sw.js in production so the app is installable and works offline-ish. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.warn("SW registration failed", err));
  }, []);
  return null;
}
