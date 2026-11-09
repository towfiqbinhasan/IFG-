import {
  Activity,
  BarChart3,
  CalendarClock,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Search,
  Shield,
  Tags,
  TrendingUp,
  UserCog,
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
  /** Live counter shown next to the label. */
  badge?: "unread";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/papers", label: "My Papers", icon: FileText, mobile: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, mobile: true },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: "unread" },
  { href: "/venues", label: "Deadlines", icon: CalendarClock, mobile: true },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/members", label: "Members", icon: Users },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/stats", label: "Lab Stats", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { href: "/admin/users", label: "Manage users", icon: UserCog, adminOnly: true },
];

/** Nav hrefs that have their own, more specific entry (so the parent isn't highlighted too). */
const SPECIFIC = NAV_ITEMS.map((i) => i.href);

export function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // e.g. /admin/users belongs to "Manage users", not "Admin".
  return !SPECIFIC.some((h) => h !== href && h.startsWith(`${href}/`) && (pathname === h || pathname.startsWith(`${h}/`)));
}
