"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { clearReturnStack } from "@/lib/return-to";
import {
  NOTIFICATION_PANEL_LIMIT,
  NOTIFICATIONS_CHANGED_EVENT,
  buildNotificationsQuery,
  formatNotificationTime,
  getNotificationHref,
  getNotificationIconName,
} from "@/lib/notifications";
import { Icon } from "@/components/icons";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/toast/toast-provider";

/**
 * The bell: unread count, a short triage list, and a way into the Inbox.
 * New unread items announce themselves once (as a toast) when the panel is
 * closed, so nothing arrives silently and nothing nags twice.
 */
export function NotificationsMenu({ onUnreadChange }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const openRef = useRef(false);
  const seenRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  const loadUnread = useCallback(async () => {
    try {
      const data = await api("/notifications/unread-count");
      setUnread(data?.count ?? 0);
    } catch {
      /* the bell just stays as it was */
    }
  }, []);

  const loadItems = useCallback(
    async ({ silent = false, announce = true } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await api(buildNotificationsQuery({ limit: NOTIFICATION_PANEL_LIMIT }));
        const next = data?.notifications ?? [];
        const seen = seenRef.current;
        if (announce && seen && !openRef.current) {
          next
            .filter((n) => !n.read_at && !seen.has(n.id))
            .forEach((n) => showToast(`${n.title}: ${n.message}`));
        }
        seenRef.current = new Set(next.map((n) => n.id));
        setItems(next);
        setTotal(typeof data?.total === "number" ? data.total : next.length);
      } catch {
        /* keep the last list */
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadUnread();
    loadItems({ silent: true, announce: false });
    const timer = setInterval(() => {
      loadUnread();
      loadItems({ silent: true });
    }, 30000);
    function outside() {
      loadUnread();
      loadItems({ silent: true, announce: false });
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, outside);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, outside);
    };
  }, [loadUnread, loadItems]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await Promise.all([loadItems(), loadUnread()]);
  }

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)));
      setUnread((n) => Math.max(0, n - 1));
    } catch {
      /* stays unread */
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
      setUnread(0);
    } catch {
      showToast("Could not mark notifications read", { tone: "danger" });
    }
  }

  async function remove(id) {
    const wasUnread = items.some((n) => n.id === id && !n.read_at);
    try {
      await api(`/notifications/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      if (wasUnread) setUnread((n) => Math.max(0, n - 1));
    } catch {
      /* leave it */
    }
  }

  async function openItem(notification) {
    if (!notification.read_at) await markRead(notification.id);
    setOpen(false);
    const href = getNotificationHref(notification);
    if (href) {
      clearReturnStack();
      router.push(href);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Open notifications"
        aria-expanded={open}
        className="icon-btn icon-btn-quiet relative"
        title="Notifications"
      >
        <Icon name="bell" className="h-4 w-4" />
        {unread > 0 ? <span className="count-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <>
          <Overlay className="sm:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div className="notif-panel">
            <div className="notif-head">
              <span className="font-semibold">Notifications</span>
              <button
                type="button"
                className="link text-xs"
                onClick={markAll}
                disabled={unread === 0}
              >
                Mark all read
              </button>
            </div>
            <div className="notif-list scrollbar-theme">
              {loading ? (
                <p className="notif-empty">Loading…</p>
              ) : items.length === 0 ? (
                <p className="notif-empty">You’re all caught up.</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={cx("notif-item group", !n.read_at && "notif-item-unread")}>
                    <button type="button" className="notif-item-main" onClick={() => openItem(n)}>
                      <span className="notif-icon">
                        <Icon name={getNotificationIconName(n)} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="notif-title">{n.title}</span>
                        <span className="notif-msg">{n.message}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] text-soft num">{formatNotificationTime(n.created_at)}</span>
                      <button
                        type="button"
                        className="notif-remove"
                        aria-label="Delete notification"
                        onClick={() => remove(n.id)}
                      >
                        <Icon name="close" className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {pathname !== "/notifications" ? (
              <Link
                href="/notifications"
                className="notif-foot"
                onClick={() => {
                  clearReturnStack();
                  setOpen(false);
                }}
              >
                Open inbox{total > items.length ? ` · ${total}` : ""}
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
