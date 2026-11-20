"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { normalizeNotificationLink } from "@/lib/notification-utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { apiFetch } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Delegates to the shared normalizeNotificationLink from lib/notifications.ts.
 * Previously duplicated here — now a single source of truth.
 */
function getSafeNotificationLink(link?: string | null): string {
  return normalizeNotificationLink(link) ?? "#";
}

/** Poll interval for the notification bell (30 s). */
const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { user, profile, loading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      if (loading) return;

      if (!user && !profile) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const res = await apiFetch("/api/notifications");
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (loading) return;

    const currentUserId = user?.id || profile?.id;
    if (!currentUserId) {
      return;
    }

    // Initial load
    fetchNotifications();

    // Replace Supabase Realtime with authenticated polling every 30 s.
    // Supabase Realtime requires a client-side subscription against the DB which
    // exposes table access and bypasses RLS on the client key. Polling through
    // the authenticated API route is safer and simpler.
    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchNotifications, user?.id, profile?.id, loading]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId: id }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line-soft bg-canvas-deep text-ink-muted transition-all hover:border-cheesco-yellow hover:text-cheesco-yellow"
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-cheesco-yellow px-1 text-[10px] font-black text-[#0A0D14] shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line-soft bg-card shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3 bg-canvas-deep">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-cheesco-yellow/20 px-2 py-0.5 text-[10px] font-bold text-cheesco-yellow">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-cheesco-yellow hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-line-soft">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && markAsRead(item.id)}
                  className={`p-3.5 transition-colors cursor-pointer ${
                    item.isRead
                      ? "bg-card opacity-75 hover:bg-canvas-deep"
                      : "bg-cheesco-yellow/5 hover:bg-cheesco-yellow/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      {!item.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow shrink-0" />
                      )}
                      <span>{item.title}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted shrink-0 font-mono">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                  {item.link && (
                    <Link
                      href={getSafeNotificationLink(item.link)}
                      onClick={() => {
                        setOpen(false);
                        const safe = getSafeNotificationLink(item.link);
                        if (typeof window !== "undefined") {
                          try {
                            const url = new URL(safe, window.location.origin);
                            const reqId = url.searchParams.get("requestId") || url.searchParams.get("id");
                            if (reqId) {
                              window.dispatchEvent(
                                new CustomEvent("cheesco:select-request", {
                                  detail: { requestId: reqId },
                                })
                              );
                            }
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-cheesco-yellow hover:underline"
                    >
                      <span>View details</span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
