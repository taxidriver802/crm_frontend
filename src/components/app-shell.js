"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "./toast/toast-provider";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";

import MainLogo from "@/assets/mainlogo.svg";
import { api } from "@/lib/api";

const WORKFLOW_NAV = [
  { href: "/dashboard", label: "Dashboard", priority: "primary" },
  { href: "/leads", label: "Leads", priority: "primary" },
  { href: "/jobs", label: "Jobs", priority: "primary" },
  { href: "/tasks", label: "Tasks", priority: "primary" },
];

const SYSTEM_NAV = [
  { href: "/files", label: "Files", priority: "secondary" },
  { href: "/integrations", label: "Integrations", priority: "secondary" },
];

const USERS_NAV = { href: "/users", label: "Users", priority: "secondary" };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(href + "/");
}

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getNotificationHref(notification) {
  if (!notification) return null;

  if (notification.entity_type === "task" && notification.entity_id) {
    return `/tasks/${notification.entity_id}`;
  }

  if (notification.entity_type === "lead" && notification.entity_id) {
    return `/leads/${notification.entity_id}`;
  }

  if (notification.entity_type === "job" && notification.entity_id) {
    return `/jobs/${notification.entity_id}`;
  }

  if (notification.type === "FILE_UPLOADED" && !notification.entity_type) {
    return "/files";
  }

  return null;
}

export function AppShell({ children, title, description, right }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [prevNotifications, setPrevNotifications] = useState([]);

  const { showToast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Failed to load user", err);
    }
  }

  async function loadUnreadCount() {
    try {
      const data = await api("/notifications/unread-count", {
        credentials: "include",
      });

      setUnreadCount(data?.count ?? 0);
    } catch (err) {
      console.error("Failed to load unread notification count", err);
    }
  }

  function getNotificationActionLabel(notification) {
    if (!notification) return null;
    if (notification.entity_type === "task") return "Open task";
    if (notification.entity_type === "lead") return "Open lead";
    if (notification.entity_type === "job") return "Open job";
    return null;
  }

  async function loadNotifications() {
    try {
      setNotificationsLoading(true);

      const data = await api("/notifications?limit=8", {
        credentials: "include",
      });

      const newNotifications = data?.notifications ?? [];
      const newItems = newNotifications.filter(
        (n) => !prevNotifications.some((p) => p.id === n.id),
      );

      if (prevNotifications.length > 0 && !notificationsOpen) {
        newItems
          .filter((n) => !n.read_at)
          .forEach((n) => showToast(`${n.title}: ${n.message}`));
      }

      setPrevNotifications(newNotifications);
      setNotifications(newNotifications);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".actions-menu")) setActionsOpen(false);
      if (!e.target.closest(".more-menu")) setMoreOpen(false);
      if (!e.target.closest(".notifications-menu")) setNotificationsOpen(false);
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setActionsOpen(false);
    setMoreOpen(false);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function handleToggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen) {
      await Promise.all([loadNotifications(), loadUnreadCount()]);
    }
  }

  async function handleMarkNotificationRead(notificationId) {
    try {
      await api(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, read_at: item.read_at || new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }

  async function handleMarkAllRead() {
    try {
      setMarkingAllRead(true);

      await api("/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });

      const now = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read_at: item.read_at || now,
        })),
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function handleNotificationClick(notification) {
    const href = getNotificationHref(notification);

    if (!notification.read_at) {
      await handleMarkNotificationRead(notification.id);
    }

    setNotificationsOpen(false);

    if (href) {
      router.push(href);
    }
  }

  async function handleClearRead() {
    try {
      await api("/notifications/read", {
        method: "DELETE",
        credentials: "include",
      });

      setNotifications((prev) => prev.filter((item) => !item.read_at));
    } catch (err) {
      console.error("Failed to clear read notifications", err);
    }
  }

  const isAdminUser = user?.role === "owner" || user?.role === "admin";

  const navItems = useMemo(() => {
    return isAdminUser
      ? [...WORKFLOW_NAV, ...SYSTEM_NAV, USERS_NAV]
      : [...WORKFLOW_NAV, ...SYSTEM_NAV];
  }, [isAdminUser]);

  const primaryNavItems = navItems.filter((item) => item.priority === "primary");
  const secondaryNavItems = navItems.filter((item) => item.priority === "secondary");

  const moreMenuHasActiveItem = secondaryNavItems.some((item) =>
    isActivePath(pathname, item.href),
  );

  const hasReadNotifications = notifications.some((n) => n.read_at);

  return (
    <div className="bg-app text-main min-h-screen">
      <header className="border-base bg-surface/95 supports-[backdrop-filter]:bg-surface/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 lg:gap-6">
            <Link href="/dashboard" className="shrink-0">
              <MainLogo className="text-main h-14 w-14 sm:h-16 sm:w-16" />
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {primaryNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "nav-pill",
                      active ? "nav-pill-active" : "nav-pill-inactive",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {secondaryNavItems.length > 0 && (
                <div className="more-menu relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((prev) => !prev)}
                    aria-expanded={moreOpen}
                    className={cx(
                      "nav-pill",
                      moreMenuHasActiveItem ? "nav-pill-active" : "nav-pill-inactive",
                    )}
                  >
                    Tools ▾
                  </button>

                  {moreOpen && (
                    <div className="dropdown-panel absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden">
                      {secondaryNavItems.map((item) => {
                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cx(
                              "block px-4 py-2 text-sm transition",
                              active
                                ? "bg-accent text-main"
                                : "hover:bg-accent text-muted",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {right ? (
              <div className="hidden items-center gap-2 lg:flex">{right}</div>
            ) : null}

            <div className="notifications-menu relative">
              <button
                type="button"
                onClick={handleToggleNotifications}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="icon-btn relative"
              >
                <span className="leading-none">🔔</span>
                {unreadCount > 0 && (
                  <span className="bg-accent-solid absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="dropdown-panel absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden">
                  <div className="border-base flex items-start justify-between gap-3 border-b px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-muted text-xs">Recent activity and reminders</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={markingAllRead || unreadCount === 0}
                        className={cx(
                          "text-muted hover:text-main text-xs transition",
                          (markingAllRead || unreadCount === 0) &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        {markingAllRead ? "Saving..." : "Mark all read"}
                      </button>

                      {hasReadNotifications && (
                        <button
                          type="button"
                          onClick={handleClearRead}
                          className="text-muted hover:text-main text-xs transition"
                        >
                          Clear read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[24rem] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="text-muted px-4 py-6 text-center text-sm">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-muted px-4 py-6 text-center text-sm">
                        You’re all caught up.
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const unread = !notification.read_at;
                        const href = getNotificationHref(notification);

                        return (
                          <div
                            key={notification.id}
                            className={cx(
                              "border-base border-b last:border-b-0",
                              unread && "bg-accent/60",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className="hover:bg-accent block w-full px-4 py-3 text-left transition"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={cx(
                                    "bg-accent-solid mt-1.5 h-2 w-2 shrink-0 rounded-full transition-opacity",
                                    unread ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-medium">
                                      {notification.title}
                                    </p>
                                    <span className="text-muted shrink-0 text-xs">
                                      {formatNotificationTime(notification.created_at)}
                                    </span>
                                  </div>

                                  <p className="text-muted mt-1 text-sm">
                                    {notification.message}
                                  </p>

                                  {href ? (
                                    <p className="text-main mt-1 text-xs">
                                      {getNotificationActionLabel(notification)}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </button>

                            {unread && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkNotificationRead(notification.id)
                                }
                                className="text-muted hover:text-main px-4 pb-3 text-xs hover:underline"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="actions-menu relative hidden md:block">
              <button onClick={() => setActionsOpen((prev) => !prev)} className="btn">
                Menu ▾
              </button>

              {actionsOpen && (
                <div className="dropdown-panel absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden">
                  {isAdminUser && (
                    <button
                      onClick={() => {
                        setActionsOpen(false);
                        setInviteModalOpen(true);
                      }}
                      className="hover:bg-accent block w-full px-4 py-2 text-left text-sm transition"
                    >
                      Invite User
                    </button>
                  )}

                  <div className="px-2 py-2">
                    <ThemeToggle className="w-full justify-start" />
                  </div>

                  <div className="border-base border-t" />

                  <button
                    onClick={handleLogout}
                    className="hover:bg-accent block w-full px-4 py-2 text-left text-sm text-red-500 transition"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="btn md:hidden"
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-base border-t px-4 pb-3 md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-2 pt-3">
              <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                Workflow
              </div>

              {primaryNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "nav-pill",
                      active ? "nav-pill-active" : "nav-pill-inactive",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {secondaryNavItems.length > 0 && (
                <>
                  <div className="border-base mt-2 border-t pt-2" />
                  <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                    Tools
                  </div>

                  {secondaryNavItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                          "nav-pill",
                          active ? "nav-pill-active" : "nav-pill-inactive",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              )}

              <div className="border-base mt-2 border-t pt-2" />
              <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                Account
              </div>

              {isAdminUser && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="btn justify-start"
                >
                  Invite User
                </button>
              )}

              <ThemeToggle className="justify-start" />

              <button onClick={handleLogout} className="btn btn-danger justify-start">
                Log out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="page-wrap">
        <div className="page-stack">
          {title ? (
            <div className="page-header">
              <div className="page-header-copy">
                <h1 className="page-title">{title}</h1>
                {description ? <p className="page-subtitle">{description}</p> : null}
              </div>

              {right ? <div className="page-actions lg:hidden">{right}</div> : null}
            </div>
          ) : null}

          {children}
        </div>
      </main>

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}
