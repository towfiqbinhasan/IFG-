"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1-5 star rating. Read-only when `onChange` is omitted. */
export function Rating({
  value,
  onChange,
  size = 18,
  className,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const interactive = !!onChange;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`Rating: ${value ?? 0} of 5`}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          disabled={!interactive}
          whileTap={interactive ? { scale: 0.8 } : undefined}
          whileHover={interactive ? { scale: 1.15 } : undefined}
          onMouseEnter={() => interactive && setHover(n)}
          onClick={() => onChange?.(value === n ? null : n)}
          className={cn("p-0.5", interactive ? "cursor-pointer" : "cursor-default")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          role={interactive ? "radio" : undefined}
          aria-checked={interactive ? value === n : undefined}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        </motion.button>
      ))}
    </div>
  );
}
