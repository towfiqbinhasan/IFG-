"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/shared/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Respect the OS "reduce motion" setting for all Framer Motion animations. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster />
        <PwaRegister />
      </MotionConfig>
    </ThemeProvider>
  );
}
