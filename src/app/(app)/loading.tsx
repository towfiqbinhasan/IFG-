import Image from "next/image";
import { brand } from "@/config/brand";

/**
 * Animated Logo-centric loading screen shown while pages/data are streaming in.
 * Matches the Intelligence Forge Lab brand and style.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing ambient aura */}
        <div className="absolute h-28 w-28 rounded-full bg-primary/20 blur-2xl animate-pulse" />

        {/* Rotating cybernetic glowing border */}
        <div className="absolute h-24 w-24 rounded-2xl border-2 border-primary/30 border-t-primary border-r-cyan-400 animate-spin transition-all" />

        {/* Central Logo Container */}
        <div className="relative z-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-card p-1 shadow-lg shadow-primary/20">
          <Image
            src={brand.logoSrc}
            alt={brand.appName}
            width={56}
            height={56}
            className="rounded-xl object-contain animate-pulse"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Lab Brand Text with Gradient */}
      <div className="mt-5 space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {brand.appName}
        </h3>
        <p className="text-xs font-medium text-muted-foreground animate-pulse">
          Loading lab data...
        </p>
      </div>

      {/* Smooth Loading Indicator bar */}
      <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary to-cyan-400 animate-pulse" />
      </div>
    </div>
  );
}
