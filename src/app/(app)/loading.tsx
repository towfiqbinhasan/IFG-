import Image from "next/image";
import { brand } from "@/config/brand";

// Pointy-top hexagon (the logo frame), radius 52 around (60, 60). Perimeter = 6 * 52 = 312.
const HEX = "M60 8 L105 34 L105 86 L60 112 L15 86 L15 34 Z";

/**
 * Branded loading state shown while a page streams in: a light pulse travels
 * around the logo's hexagon frame while the emblem glows. Pure CSS (no JS),
 * so it renders instantly from the server.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center" aria-busy="true" aria-label="Loading">
      <div className="relative h-32 w-32">
        <div className="absolute inset-4 animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgb(34_176_240/0.45),transparent_70%)] blur-md" />
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="loading-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-navy)" />
              <stop offset="100%" stopColor="var(--brand-cyan)" />
            </linearGradient>
          </defs>
          <path d={HEX} fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeLinejoin="round" />
          <path
            d={HEX}
            fill="none"
            stroke="url(#loading-stroke)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="90 222"
            className="animate-hex-trace"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={brand.logoSrc}
            alt=""
            width={60}
            height={60}
            priority
            unoptimized
            className="rounded-[22%] shadow-lg shadow-sky-500/20 ring-1 ring-black/5 dark:ring-white/10"
          />
        </div>
      </div>
      <p className="mt-5 font-display text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Forging your workspace…</p>
      <span className="sr-only">Loading {brand.appName}</span>
    </div>
  );
}
