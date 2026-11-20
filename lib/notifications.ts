import { supabaseServer } from "@/lib/supabase/server";
import type { UserRole } from "./types";

export interface SystemNotification {
  id: string;
  userId: string;
  role?: string;
  title: string;
  message: string;
  type: "RENTAL_REQUEST" | "QUOTATION" | "PAYMENT" | "LOGISTICS" | "DELIVERY" | "INSPECTION" | "DISPUTE" | "MESSAGE" | "SYSTEM" | string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// In-memory fallback ring-buffer for instant notifications and mock/dev sessions
const memoryNotifications: SystemNotification[] = [];

import { normalizeNotificationLink } from "./notification-utils";
export { normalizeNotificationLink };

/**
 * Add a notification to the in-memory fallback list (capped at 200 items)
 */
function recordInMemory(n: SystemNotification) {
  memoryNotifications.unshift(n);
  if (memoryNotifications.length > 200) {
    memoryNotifications.pop();
  }
}

/**
 * Notify all admins of a specific set of roles (or SUPER_ADMIN)
 */
export async function notifyAdmins(
  roles: UserRole[],
  payload: {
    title: string;
    message: string;
    link?: string;
    type?: string;
  }
): Promise<void> {
  const targetRoles = Array.from(new Set([...roles, "SUPER_ADMIN" as UserRole]));
  const notifType = payload.type || "SYSTEM";

  const cleanLink = normalizeNotificationLink(payload.link) || "/admin/operations";

  // 1. Record in memory for immediate UI delivery regardless of DB state
  recordInMemory({
    id: "mem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    userId: "admin-broadcast",
    role: targetRoles.join(","),
    title: payload.title,
    message: payload.message,
    type: notifType,
    link: cleanLink,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // 2. Persist to Supabase notifications table for DB admin users
  try {
    const { data: adminUsers, error } = await supabaseServer
      .from("users")
      .select("id, role, email")
      .in("role", targetRoles);

    if (!error && adminUsers && adminUsers.length > 0) {
      // Deduplicate admin users by ID
      const uniqueAdmins = Array.from(new Map(adminUsers.map((u) => [u.id, u])).values());

      const dbInserts = uniqueAdmins.map((admin) => ({
        user_id: admin.id,
        title: payload.title,
        message: payload.message,
        type: notifType,
        link: cleanLink,
        is_read: false,
      }));

      await supabaseServer.from("notifications").insert(dbInserts);
    }
  } catch (err) {
    console.warn("Failed to persist admin notification to DB:", err);
  }
}

/**
 * Notify a specific user (Customer or Merchant)
 */
export async function notifyUser(
  userId: string,
  payload: {
    title: string;
    message: string;
    link?: string;
    type?: string;
  }
): Promise<void> {
  const notifType = payload.type || "SYSTEM";
  const cleanLink = normalizeNotificationLink(payload.link);

  // 1. Record in memory
  recordInMemory({
    id: "mem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    userId,
    title: payload.title,
    message: payload.message,
    type: notifType,
    link: cleanLink,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // 2. Persist to Supabase if valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (isUuid) {
    try {
      await supabaseServer.from("notifications").insert({
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: notifType,
        link: cleanLink || null,
        is_read: false,
      });
    } catch (err) {
      console.warn("Failed to persist user notification to DB:", err);
    }
  }
}

/**
 * Fetch all notifications for a given user and their role
 */
export async function getNotifications(
  userId: string,
  role?: UserRole
): Promise<{ notifications: SystemNotification[]; unreadCount: number }> {
  const isAdmin = [
    "SUPER_ADMIN",
    "OPERATIONS_ADMIN",
    "VERIFICATION_ADMIN",
    "FINANCE_ADMIN",
    "SUPPORT_ADMIN",
  ].includes(role as string);

  const results: SystemNotification[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch from Supabase notifications table
  try {
    let query = supabaseServer
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: dbNotifs, error } = await query;
    if (!error && dbNotifs) {
      for (const n of dbNotifs) {
        seenIds.add(n.id);
        results.push({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          type: n.type,
          link: normalizeNotificationLink(n.link || n.action_url) || undefined,
          isRead: Boolean(n.is_read ?? n.read ?? false),
          createdAt: n.created_at,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch notifications from DB:", err);
  }

  // 2. Merge in-memory notifications — but only include entries that do NOT have
  //    a matching DB row (same title + message + user, created within 60 seconds).
  //    This prevents the mem-* shadow copy from appearing alongside the real DB row
  //    when notifyUser() is called (it writes to both memory AND the DB).
  const dbContentKeys = new Set(
    results.map((n) => `${n.userId}|${n.title}|${Math.floor(new Date(n.createdAt).getTime() / 60000)}`)
  );

  for (const m of memoryNotifications) {
    if (seenIds.has(m.id)) continue;

    // Suppress the mem-* entry if an equivalent DB row was already fetched
    const contentKey = `${m.userId}|${m.title}|${Math.floor(new Date(m.createdAt).getTime() / 60000)}`;
    if (dbContentKeys.has(contentKey)) continue;

    if (isAdmin) {
      // Admins see admin-broadcast or matching roles or their userId
      if (
        m.userId === "admin-broadcast" ||
        m.userId === userId ||
        (m.role && (m.role.includes(role || "") || m.role.includes("SUPER_ADMIN")))
      ) {
        results.push(m);
      }
    } else {
      // Regular user sees their own notifications
      if (m.userId === userId) {
        results.push(m);
      }
    }
  }

  // Sort descending by date
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = results.filter((n) => !n.isRead).length;

  return { notifications: results, unreadCount };
}

/**
 * Mark a single notification or all notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  options: { notificationId?: string; markAll?: boolean }
): Promise<void> {
  const { notificationId, markAll } = options;

  // Mark in memory
  if (markAll) {
    for (const m of memoryNotifications) {
      if (m.userId === userId || m.userId === "admin-broadcast") {
        m.isRead = true;
      }
    }
  } else if (notificationId) {
    const found = memoryNotifications.find((m) => m.id === notificationId && (m.userId === userId || m.userId === "admin-broadcast"));
    if (found) found.isRead = true;
  }

  // Mark in Supabase DB
  try {
    if (markAll) {
      await supabaseServer
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else if (notificationId && !notificationId.startsWith("mem-")) {
      await supabaseServer
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);
    }
  } catch (err) {
    console.warn("Failed to update notification read status in DB:", err);
  }
}
