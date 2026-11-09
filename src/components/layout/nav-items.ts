import {
  Activity,
  BarChart3,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Search,
  Shield,
  Tags,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Shown in the mobile bottom bar (max 4; the 5th slot is "More"). */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/papers", label: "My Papers", icon: FileText, mobile: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, mobile: true },
  { href: "/venues", label: "Deadlines", icon: CalendarClock, mobile: true },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/members", label: "Members", icon: Users },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/stats", label: "Lab Stats", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
