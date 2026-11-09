"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { messagePreview } from "@/lib/chat";
import type { Message } from "@/lib/types";

export interface DeadlineReminder {
  venueId: string;
  venueName: string;
  label: string;
  date: string;
}

type Permission = NotificationPermission | "unsupported";

interface Ctx {
  /** Unread chat messages across the user's conversations. */
  unread: number;
  refreshUnread: () => void;
  /** Desktop notification permission for this browser. */
  permission: Permission;
  enableDesktop: () => Promise<void>;
  chatReady: boolean;
}

const NotificationsContext = createContext<Ctx>({
  unread: 0,
  refreshUnread: () => {},
  permission: "unsupported",
  enableDesktop: async () => {},
  chatReady: false,
});

export const useNotifications = () => useContext(NotificationsContext);

/** Days-before-deadline at which a desktop reminder is shown (once each, per device). */
const REMINDER_DAYS = [7, 3, 1, 0];
const SEEN_KEY = "ifl-deadline-reminders";

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: reminders may repeat, which is harmless */
  }
}

function desktopNotify(title: string, body: string, onClick?: () => void) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/icons/icon-192.png", tag: title + body });
    if (onClick)
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

/**
 * App-wide notifications:
 *  - live chat messages (Supabase Realtime) -> unread badge, toast, desktop notification
 *  - deadline reminders 7 / 3 / 1 / 0 days before (desktop notification + toast, once each)
 * Works while the app is open in a tab (it can be in the background).
 */
export function NotificationsProvider({
  userId,
  initialUnread,
  chatReady,
  reminders,
  children,
}: {
  userId: string;
  initialUnread: number;
  /** False until migration 005 has been run. */
  chatReady: boolean;
  reminders: DeadlineReminder[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [unread, setUnread] = useState(initialUnread);
  const [permission, setPermission] = useState<Permission>("unsupported");
  const myConversations = useRef<Set<string> | null>(null);
  const openConversation = useRef<string | null>(null);

  // Which conversation is on screen right now (no notification for it while visible).
  openConversation.current = pathname === "/messages" ? searchParams.get("c") : null;

  useEffect(() => setUnread(initialUnread), [initialUnread]);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!chatReady) return;
    const { data, error } = await createClient().rpc("unread_message_count");
    if (!error && typeof data === "number") setUnread(data);
  }, [chatReady]);

  const loadMyConversations = useCallback(async () => {
    const { data } = await createClient().from("conversation_members").select("conversation_id").eq("user_id", userId);
    myConversations.current = new Set((data ?? []).map((r) => r.conversation_id as string));
  }, [userId]);

  // Live messages.
  useEffect(() => {
    if (!chatReady) return;
    const supabase = createClient();
    loadMyConversations();
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as Message;
        if (m.sender_id === userId) return;
        // Admins can read every chat; only notify about chats you are in.
        if (!myConversations.current?.has(m.conversation_id)) {
          await loadMyConversations();
          if (!myConversations.current?.has(m.conversation_id)) return;
        }
        const visible = openConversation.current === m.conversation_id && document.visibilityState === "visible";
        if (visible) return;
        setUnread((u) => u + 1);

        const { data: sender } = await supabase.from("profiles").select("full_name").eq("id", m.sender_id ?? "").maybeSingle();
        const title = sender?.full_name ?? "New message";
        const body = messagePreview(m);
        const open = () => router.push(`/messages?c=${m.conversation_id}`);
        if (document.visibilityState === "visible") {
          toast(title, { description: body, action: { label: "Open", onClick: open } });
        } else {
          desktopNotify(title, body, open);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatReady, userId, router, loadMyConversations]);

  // Deadline reminders (checked on load and every 30 minutes).
  useEffect(() => {
    function check() {
      let seen: Record<string, true> = {};
      try {
        seen = JSON.parse(safeGet(SEEN_KEY) ?? "{}");
      } catch {
        seen = {};
      }
      const now = new Date();
      let changed = false;
      for (const r of reminders) {
        const date = new Date(r.date);
        if (date < now) continue;
        const days = differenceInCalendarDays(date, now);
        // Smallest reminder step that still covers the remaining days (5 days left -> the "7" reminder).
        const step = [...REMINDER_DAYS].reverse().find((d) => days <= d);
        if (step === undefined) continue;
        const key = `${r.venueId}:${r.label}:${r.date}:${step}`;
        if (seen[key]) continue;
        seen[key] = true;
        changed = true;
        const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
        const title = `⏰ ${r.venueName}`;
        const body = `${r.label} deadline ${when}`;
        const open = () => router.push(`/venues/${r.venueId}`);
        toast.warning(title, { description: body, action: { label: "View", onClick: open }, duration: 10_000 });
        desktopNotify(title, body, open);
      }
      if (changed) safeSet(SEEN_KEY, JSON.stringify(seen));
    }
    check();
    const t = setInterval(check, 30 * 60_000);
    return () => clearInterval(t);
  }, [reminders, router]);

  const enableDesktop = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("This browser doesn't support desktop notifications.");
      return;
    }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      toast.success("Desktop notifications are on");
      desktopNotify("Notifications enabled", "You'll be alerted about new messages and upcoming deadlines.");
    } else if (p === "denied") {
      toast.error("Notifications are blocked. Allow them from the lock icon in the address bar.");
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ unread, refreshUnread, permission, enableDesktop, chatReady }}>
      {children}
    </NotificationsContext.Provider>
  );
}
