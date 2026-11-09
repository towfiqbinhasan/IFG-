"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";
import { NAV_ITEMS, isActive } from "./nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

/** Desktop sidebar (lg and up): brand header, animated active indicator. */
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card/60 px-3 py-5 backdrop-blur-xl lg:flex">
      {/* Brand glow + hex texture at the top of the rail */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 hex-pattern opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgb(34_176_240/0.22),transparent_70%)]" />

      <Link href="/dashboard" className="relative mb-8 px-2 transition-transform active:scale-[0.98]">
        <Logo size={42} withText />
      </Link>

      <nav className="relative flex flex-1 flex-col gap-1" aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active ? "font-semibold text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-forge" />
                </motion.span>
              )}
              <item.icon
                className={cn(
                  "relative h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-auto border-t border-border/50 px-3 pt-3">
        <p className="truncate text-[11px] font-medium text-muted-foreground/80">
          © {new Date().getFullYear()} {brand.appName}
        </p>
      </div>
    </aside>
  );
}
