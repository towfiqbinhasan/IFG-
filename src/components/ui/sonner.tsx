"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/** Toast host, themed to match light/dark mode. Use `toast()` from "sonner" anywhere. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "rounded-xl" } }}
    />
  );
}
