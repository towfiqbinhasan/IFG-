"use client";

import Link from "next/link";
import { Bell, KeyRound, LogOut, Shield, UserCircle } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Profile } from "@/lib/types";

export interface DeadlineAlert {
  venueId: string;
  venueName: string;
  label: string;
  date: string;
}

/** Top bar: logo (mobile), deadline bell with badge, theme toggle, user menu. */
export function Header({ profile, alerts }: { profile: Profile; alerts: DeadlineAlert[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 pt-safe shadow-sm backdrop-blur-xl">
      {/* Thin forge-gradient accent line */}
      <div aria-hidden className="h-0.5 w-full bg-forge opacity-80" />
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <Link href="/dashboard" className="lg:hidden transition-transform active:scale-95">
          <Logo size={34} withText />
        </Link>
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-accent/70 transition-transform active:scale-95"
              aria-label={`${alerts.length} deadlines within 7 days`}
            >
              <Bell className="h-5 w-5 transition-transform hover:rotate-12" />
              {alerts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
                  {alerts.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl p-2 shadow-xl border-border/60">
            <DropdownMenuLabel className="font-semibold text-xs tracking-wider uppercase text-muted-foreground px-2">
              Deadlines in the next 7 days
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No urgent deadlines! 🎉</p>
            ) : (
              alerts.map((a) => (
                <DropdownMenuItem key={`${a.venueId}-${a.label}`} asChild className="rounded-lg p-2.5 cursor-pointer">
                  <Link href={`/venues/${a.venueId}`} className="flex flex-col items-start gap-1">
                    <span className="font-medium text-sm text-foreground">{a.venueName}</span>
                    <span className="text-xs text-primary font-medium">
                      {a.label} · in {formatDistanceToNowStrict(new Date(a.date))}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account menu"
            >
              <div className="rounded-full ring-2 ring-primary/20 p-0.5 group-hover:ring-primary/50 transition-all">
                <UserAvatar name={profile.full_name} src={profile.avatar_url} className="h-8 w-8" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl p-2 shadow-xl border-border/60">
            <DropdownMenuLabel className="flex flex-col px-2 py-1.5">
              <span className="font-semibold text-sm">{profile.full_name}</span>
              <span className="text-xs font-normal text-muted-foreground">@{profile.username}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" /> Profile & settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/profile#password">
                <KeyRound className="mr-2 h-4 w-4" /> Change password
              </Link>
            </DropdownMenuItem>
            {profile.role === "admin" && (
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link href="/admin">
                  <Shield className="mr-2 h-4 w-4" /> Admin panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
              <a href="/api/auth/signout">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
