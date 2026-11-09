"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

/** Error boundary for every page inside the app shell. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="relative">
        <Logo size={64} />
        <span className="absolute -bottom-2 -right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow">
          <AlertTriangle className="h-4 w-4" />
        </span>
      </div>
      <h2 className="mt-2 font-display text-lg font-bold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button variant="forge" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
