"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const { showToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const notificationsOpenRef = useRef(false);
  const prevNotificationsRef = useRef([]);

  useEffect(() => {
    notificationsOpenRef.current = notificationsOpen;
  }, [notificationsOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".notifications-menu")) setNotificationsOpen(false);
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest(".mobile-menu") && !e.target.closest(".menu-trigger")) {
        setMobileMenuOpen(false);
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener("click", handleClick);
    }

    return () => document.removeEventListener("click", handleClick);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
      loadNotifications({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const isAdminUser = user?.role === "owner" || user?.role === "admin";

  const navItems = useMemo(() => {
    return isAdminUser
      ? [...WORKFLOW_NAV, ...SYSTEM_NAV, USERS_NAV]
      : [...WORKFLOW_NAV, ...SYSTEM_NAV];
  }, [isAdminUser]);

  const primaryNavItems = navItems.filter((item) => item.priority === "primary");
  const secondaryNavItems = navItems.filter((item) => item.priority === "secondary");

  useEffect(() => {
    loadUser();
    loadUnreadCount();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
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

  async function loadNotifications(options = {}) {
    const silent = Boolean(options.silent);
    try {
      if (!silent) setNotificationsLoading(true);

      const data = await api("/notifications?limit=8", {
        credentials: "include",
      });

      const newNotifications = data?.notifications ?? [];
      const prev = prevNotificationsRef.current;
      const newItems = newNotifications.filter((n) => !prev.some((p) => p.id === n.id));

      if (prev.length > 0 && !notificationsOpenRef.current) {
        newItems
          .filter((n) => !n.read_at)
          .forEach((n) => showToast(`${n.title}: ${n.message}`));
      }

      prevNotificationsRef.current = newNotifications;
      setNotifications(newNotifications);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }

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

  const hasReadNotifications = notifications.some((n) => n.read_at);

  function renderNavLink(item, { onNavigate } = {}) {
    const active = isActivePath(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cx(
          "flex items-center rounded-lg px-3 py-2 text-sm transition",
          active ? "bg-accent text-main font-medium" : "text-muted hover:bg-accent/60",
        )}
      >
        {item.label}
      </Link>
    );
  }

  function renderNotificationsPanel() {
    return (
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
                (markingAllRead || unreadCount === 0) && "cursor-not-allowed opacity-50",
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

                        <p className="text-muted mt-1 text-sm">{notification.message}</p>

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
                      onClick={() => handleMarkNotificationRead(notification.id)}
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
    );
  }

  return (
    <div className="bg-app text-main flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className="scrollbar-theme border-base bg-surface hidden h-full w-64 flex-col border-r lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-6 py-5">
          <MainLogo className="h-10 w-10" />
          <span className="font-semibold">CRM</span>
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3">
          <div className="space-y-1">
            {primaryNavItems.map((item) => renderNavLink(item))}
          </div>

          {secondaryNavItems.length > 0 && (
            <div className="space-y-1">
              <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                Tools
              </div>
              {secondaryNavItems.map((item) => renderNavLink(item))}
            </div>
          )}
        </nav>

        <div className="border-base space-y-2 border-t p-4">
          {isAdminUser && (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="btn w-full justify-start"
            >
              Invite User
            </button>
          )}

          <ThemeToggle className="w-full justify-start" />

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-danger w-full justify-start"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="border-base bg-surface-glass relative sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-6 py-3 backdrop-blur-md">
          <div className="min-w-0">
            {title ? <h1 className="text-lg font-semibold">{title}</h1> : null}
            {description ? (
              <p className="text-muted mt-0.5 text-sm">{description}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

              {notificationsOpen && renderNotificationsPanel()}
            </div>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="btn menu-trigger lg:hidden"
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed bottom-0 left-0 right-0 z-40 bg-black/30 lg:hidden"
              aria-hidden
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="mobile-menu dropdown-panel animate-in fade-in zoom-in-95 fixed right-3 top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] z-50 flex max-h-[min(70vh,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg shadow-lg duration-150 lg:hidden">
              <div className="border-base flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  className="text-muted hover:text-main rounded-md p-1 text-lg leading-none"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="scrollbar-theme min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div className="space-y-1">
                  <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                    Workflow
                  </div>
                  {primaryNavItems.map((item) =>
                    renderNavLink(item, { onNavigate: () => setMobileMenuOpen(false) }),
                  )}
                </div>

                {secondaryNavItems.length > 0 && (
                  <>
                    <div className="border-base border-t pt-2" />
                    <div className="space-y-1">
                      <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                        Tools
                      </div>
                      {secondaryNavItems.map((item) =>
                        renderNavLink(item, {
                          onNavigate: () => setMobileMenuOpen(false),
                        }),
                      )}
                    </div>
                  </>
                )}

                <div className="border-base space-y-2 border-t pt-3">
                  <div className="text-muted px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide">
                    Account
                  </div>
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setInviteModalOpen(true);
                      }}
                      className="btn w-full justify-start"
                    >
                      Invite User
                    </button>
                  )}

                  <ThemeToggle className="w-full justify-start" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-danger w-full justify-start"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PAGE */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style jsx>{`
            main::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="page-wrap">
            <div className="page-stack">
              {right ? <div className="page-actions lg:hidden">{right}</div> : null}
              {children}
            </div>
          </div>
        </main>
      </div>

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}
