"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS, isActive } from "./nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { brand } from "@/config/brand";

/** Modern Desktop sidebar with glassmorphism & fluid hover indicators. */
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/50 bg-card/60 backdrop-blur-xl px-3 py-5 lg:flex shadow-sm">
      <Link href="/dashboard" className="mb-6 px-3 transition-transform hover:scale-[1.02] active:scale-[0.98]">
        <Logo size={40} withText />
      </Link>

      <div className="mx-3 mb-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Intelligence Forge
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">Research & Paper Hub</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/25 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "relative h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-3 border-t border-border/40">
        <p className="text-[11px] font-medium text-muted-foreground/75 truncate">
          © {new Date().getFullYear()} {brand.appName}
        </p>
      </div>
    </aside>
  );
}
