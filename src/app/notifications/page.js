"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { Alert } from "@/components/ui/alert";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import {
  buildNotificationsQuery,
  emitNotificationsChanged,
  formatNotificationTime,
  getNotificationHref,
  getNotificationIconName,
  notificationDayGroup,
} from "@/lib/notifications";

const PAGE_SIZE = 30;

function groupNotifications(items) {
  const groups = [];

  for (const item of items) {
    const label = notificationDayGroup(item.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const push = useReturnPush();
  const requestId = useRef(0);

  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadUnreadCount = useCallback(async () => {
    const data = await api("/notifications/unread-count");
    const count = data?.count ?? 0;
    setUnreadCount(count);
    return count;
  }, []);

  const loadPage = useCallback(
    async ({ offset = 0, append = false, unreadOnly, quiet = false } = {}) => {
      const id = ++requestId.current;
      const nextUnreadOnly = unreadOnly ?? filter === "unread";

      if (append) setLoadingMore(true);
      else if (!quiet) setLoading(true);
      setError("");

      try {
        const data = await api(
          buildNotificationsQuery({
            limit: PAGE_SIZE,
            offset,
            unreadOnly: nextUnreadOnly,
          }),
        );
        if (id !== requestId.current) return null;

        const nextItems = data?.notifications ?? [];
        const total = data?.total ?? nextItems.length;

        setItems((prev) => {
          if (!append) return nextItems;
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...nextItems.filter((item) => !seen.has(item.id))];
        });
        setListTotal(total);
        setHasMore(Boolean(data?.hasMore));
        if (!nextUnreadOnly && offset === 0) setHistoryTotal(total);
        return data;
      } catch (err) {
        console.error(err);
        if (id === requestId.current) {
          setError(append ? "Couldn’t load more notifications." : "Failed to load notifications.");
        }
        return null;
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filter],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        if (cancelled) return;
        setReady(true);
      } catch (err) {
        console.error(err);
        router.replace("/login");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // Initial load only. Filter changes reload below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadPage({ offset: 0, unreadOnly: filter === "unread" });
    loadUnreadCount().catch((err) => {
      console.error(err);
    });
  }, [filter, ready, loadPage, loadUnreadCount]);

  const readCount = Math.max(0, historyTotal - unreadCount);
  const groups = useMemo(() => groupNotifications(items), [items]);

  const description = loading
    ? "Loading…"
    : historyTotal === 0
      ? "Nothing saved"
      : unreadCount > 0
        ? `${unreadCount} unread · ${historyTotal} total`
        : `${historyTotal} total`;

  async function handleMarkRead(notification) {
    if (notification.read_at) return notification;

    await api(`/notifications/${notification.id}/read`, { method: "PATCH" });
    const readAt = new Date().toISOString();
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setItems((prev) =>
      filter === "unread"
        ? prev.filter((item) => item.id !== notification.id)
        : prev.map((item) =>
            item.id === notification.id ? { ...item, read_at: item.read_at || readAt } : item,
          ),
    );
    if (filter === "unread") {
      setListTotal((prev) => Math.max(0, prev - 1));
    }
    emitNotificationsChanged();
    return { ...notification, read_at: readAt };
  }

  async function handleOpen(notification) {
    try {
      await handleMarkRead(notification);
    } catch (err) {
      console.error(err);
      setError("Couldn’t update that notification.");
      return;
    }

    const href = getNotificationHref(notification);
    if (href) push(href);
  }

  async function handleDelete(notification) {
    setBusyId(notification.id);
    setError("");

    try {
      await api(`/notifications/${notification.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== notification.id));
      setListTotal((prev) => Math.max(0, prev - 1));
      setHistoryTotal((prev) => Math.max(0, prev - 1));
      if (!notification.read_at) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      emitNotificationsChanged();
    } catch (err) {
      console.error(err);
      setError("Couldn’t delete that notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError("");

    try {
      await api("/notifications/read-all", { method: "PATCH" });
      const now = new Date().toISOString();
      setUnreadCount(0);
      setItems((prev) =>
        filter === "unread"
          ? []
          : prev.map((item) => ({ ...item, read_at: item.read_at || now })),
      );
      if (filter === "unread") setListTotal(0);
      emitNotificationsChanged();
    } catch (err) {
      console.error(err);
      setError("Couldn’t mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearRead() {
    if (clearing || readCount === 0) return;
    setClearing(true);
    setError("");

    try {
      await api("/notifications/read", { method: "DELETE" });
      emitNotificationsChanged();
      const [list] = await Promise.all([
        loadPage({
          offset: 0,
          unreadOnly: filter === "unread",
          quiet: true,
        }),
        loadUnreadCount(),
      ]);
      if (filter === "unread" && list) {
        const all = await api(buildNotificationsQuery({ limit: 1 }));
        setHistoryTotal(all?.total ?? 0);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn’t clear read notifications.");
    } finally {
      setClearing(false);
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-sm"
        onClick={handleMarkAllRead}
        disabled={markingAll || unreadCount === 0}
      >
        {markingAll ? "Saving…" : "Mark all read"}
      </button>
      {readCount > 0 ? (
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleClearRead}
          disabled={clearing}
        >
          {clearing ? "Clearing…" : "Clear read"}
        </button>
      ) : null}
    </div>
  );

  return (
    <AppShell title="Notifications" description={description} right={ready ? headerActions : null}>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <Segmented
          className="w-full min-w-0"
          aria-label="Notification filter"
          value={filter}
          onChange={setFilter}
          options={[
            {
              value: "all",
              label: "All",
              count: loading && historyTotal === 0 ? undefined : historyTotal,
            },
            {
              value: "unread",
              label: "Unread",
              count: loading && unreadCount === 0 ? undefined : unreadCount,
            },
          ]}
        />

        {loading ? (
          <div className="card px-4 py-10 text-center text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Icon name={filter === "unread" ? "bell" : "inbox"} className="h-5 w-5" />}
            title={filter === "unread" ? "No unread notifications" : "You’re all caught up"}
            description={
              filter === "unread"
                ? "Everything in your history is already read."
                : "New alerts will show up here and in the bell."
            }
          />
        ) : (
          <div className="card overflow-hidden">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {group.label}
                </h2>
                <ul>
                  {group.items.map((notification) => {
                    const unread = !notification.read_at;
                    const iconName = getNotificationIconName(notification);

                    return (
                      <li key={notification.id}>
                        <div
                          className={cx(
                            "group relative flex items-start gap-3 px-4 py-3 transition hover:bg-accent",
                            !unread && "opacity-70 hover:opacity-100",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cx(
                              "absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-accent-solid",
                              unread ? "opacity-100" : "opacity-0",
                            )}
                          />

                          <button
                            type="button"
                            onClick={() => handleOpen(notification)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <span
                              className={cx(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-theme-md",
                                unread ? "bg-surface text-muted" : "bg-surface text-soft",
                              )}
                            >
                              <Icon name={iconName} className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cx(
                                  "block text-sm leading-snug",
                                  unread ? "font-semibold text-main" : "font-medium text-muted",
                                )}
                              >
                                {notification.title}
                              </span>
                              <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                                {notification.message}
                              </span>
                            </span>
                          </button>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                              type="button"
                              aria-label="Delete notification"
                              title="Delete"
                              disabled={busyId === notification.id}
                              onClick={() => handleDelete(notification)}
                              className={cx(
                                "inline-flex h-6 w-6 items-center justify-center rounded-theme-sm text-soft transition",
                                "hover:bg-surface hover:text-main",
                                "opacity-0 pointer-events-none",
                                "group-hover:pointer-events-auto group-hover:opacity-100",
                                "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                                "focus-visible:pointer-events-auto focus-visible:opacity-100",
                                "max-lg:pointer-events-auto max-lg:opacity-100",
                              )}
                            >
                              <Icon name="close" className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] tabular-nums text-soft">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hasMore ? (
              <div className="border-t border-base px-4 py-3">
                <button
                  type="button"
                  className="btn btn-sm w-full"
                  onClick={() =>
                    loadPage({
                      offset: items.length,
                      append: true,
                      unreadOnly: filter === "unread",
                    })
                  }
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading…"
                    : listTotal > items.length
                      ? `Show more · ${listTotal - items.length} older`
                      : "Show more"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
