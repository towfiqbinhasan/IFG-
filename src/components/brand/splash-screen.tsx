"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { brand } from "@/config/brand";
import { DefaultSplashAnimation } from "./splash-animation";
import { CustomSplash } from "./custom-splash";

const KEY = "rl-splash-shown";

/**
 * Full-screen splash overlay shown on first load. Its content is chosen by
 * brand.splash.type, so you can swap the animation without touching layouts.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = brand.splash.oncePerSession && sessionStorage.getItem(KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    }, brand.splash.minDurationMs);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="splash-root fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: brand.splash.background }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          aria-hidden
        >
          {brand.splash.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.splash.src} alt="" className="max-h-48 max-w-[60vw]" />
          )}
          {brand.splash.type === "video" && (
            <video src={brand.splash.src} autoPlay muted playsInline className="max-h-64 max-w-[70vw]" />
          )}
          {brand.splash.type === "custom" && <CustomSplash />}
          {brand.splash.type === "default" && <DefaultSplashAnimation />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
