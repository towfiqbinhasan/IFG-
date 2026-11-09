"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarClock, FileText, LayoutGrid, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/papers", label: "Papers", icon: FileText },
  { href: "/admin/topics", label: "Topics", icon: Tags },
  { href: "/admin/venues", label: "Venues", icon: CalendarClock },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none -mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4" aria-label="Admin">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {active && <motion.span layoutId="admin-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
