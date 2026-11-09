import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, resolving conflicts (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for avatar fallbacks: "Ada Lovelace" -> "AL". */
export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "90" -> "1h 30m". */
export function formatMinutes(min?: number | null) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** Normalise a DOI or URL into a clickable link. */
export function doiHref(value?: string | null) {
  if (!value) return null;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^10\.\d{4,9}\//.test(v)) return `https://doi.org/${v}`;
  return `https://${v}`;
}

/** Safe "YYYY-MM" month key. */
export function monthKey(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Random readable temporary password, e.g. "Lab-k7Qm-29xP".
 * Always contains at least one digit, so it satisfies validatePassword()
 * (letters + numbers); ambiguous characters (0/O, 1/l/I) are excluded.
 */
export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const digits = "23456789";
  const rand = (n: number) => {
    const arr = new Uint32Array(n);
    crypto.getRandomValues(arr);
    return Array.from(arr);
  };
  const body = rand(8).map((x) => chars[x % chars.length]!);
  if (!body.some((c) => digits.includes(c))) {
    const [pos, d] = rand(2);
    body[pos! % body.length] = digits[d! % digits.length]!;
  }
  return `Lab-${body.slice(0, 4).join("")}-${body.slice(4).join("")}`;
}
