"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAV_ITEMS, isActive } from "./nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

/** Mobile bottom navigation with a "More" sheet for remaining pages. */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.mobile);
  const more = NAV_ITEMS.filter((i) => !i.mobile && (!i.adminOnly || role === "admin"));
  const moreActive = more.some((i) => isActive(pathname, i.href)) || isActive(pathname, "/profile");

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-lg lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />
                )}
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-2">
          <DialogTitle className="mb-2">More</DialogTitle>
          <div className="grid grid-cols-3 gap-2">
            {[...more, { href: "/profile", label: "Profile", icon: UserCircle }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors hover:bg-accent",
                  isActive(pathname, item.href) && "border-primary bg-primary/5 text-primary",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <a
              href="/api/auth/signout"
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
