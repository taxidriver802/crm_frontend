"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { useToast } from "./toast-provider";
import { InviteUserModal } from "@/components/invite-user-modal";

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

  return null;
}

export function AppShell({ children, title, right }) {
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

  const { theme, setTheme, systemTheme } = useTheme();
  const [prevNotifications, setPrevNotifications] = useState([]);

  const { showToast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function handleToggleTheme() {
    const activeTheme = theme === "system" ? systemTheme : theme;
    setTheme(activeTheme === "dark" ? "light" : "dark");
  }

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

      if (prevNotifications.length > 0) {
        newItems.forEach((n) => {
          showToast(n.title);
        });
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
      if (!e.target.closest(".actions-menu")) {
        setActionsOpen(false);
      }

      if (!e.target.closest(".more-menu")) {
        setMoreOpen(false);
      }

      if (!e.target.closest(".notifications-menu")) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
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
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.left}>
            <Link href="/dashboard" className={s.brand}>
              <MainLogo className="text-main h-16 w-16 sm:h-20 sm:w-20" />
            </Link>

            <nav className={s.navDesktopWide}>
              {primaryNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      s.navItem,
                      active ? s.navItemActive : s.navItemInactive,
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
                      s.navItem,
                      moreMenuHasActiveItem ? s.navItemActive : s.navItemInactive,
                    )}
                  >
                    Tools ▾
                  </button>

                  {moreOpen && (
                    <div className={s.dropdown}>
                      {secondaryNavItems.map((item) => {
                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cx(
                              s.dropdownItem,
                              active ? "bg-accent" : "hover:bg-muted",
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

            <nav className={s.navDesktopMedium}>
              {primaryNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      s.navItem,
                      active ? s.navItemActive : s.navItemInactive,
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
                      s.navItem,
                      moreMenuHasActiveItem ? s.navItemActive : s.navItemInactive,
                    )}
                  >
                    Tools ▾
                  </button>

                  {moreOpen && (
                    <div className={s.dropdown}>
                      {secondaryNavItems.map((item) => {
                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cx(
                              s.dropdownItem,
                              active ? "bg-accent-soft" : "hover:bg-muted",
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

          <div className={s.right}>
            {right ? <div className={s.rightSlot}>{right}</div> : null}

            <div className="notifications-menu relative">
              <button
                type="button"
                onClick={handleToggleNotifications}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className={s.iconButton}
              >
                <span className={s.bellIcon}>🔔</span>
                {unreadCount > 0 && (
                  <span className={s.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className={s.notificationsDropdown}>
                  <div className={s.notificationsHeader}>
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
                          s.inlineAction,
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
                          className={s.inlineAction}
                        >
                          Clear read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={s.notificationsList}>
                    {notificationsLoading ? (
                      <div className={s.notificationsEmpty}>Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className={s.notificationsEmpty}>You’re all caught up.</div>
                    ) : (
                      notifications.map((notification) => {
                        const unread = !notification.read_at;
                        const href = getNotificationHref(notification);

                        return (
                          <div
                            key={notification.id}
                            className={cx(
                              s.notificationItem,
                              unread && s.notificationItemUnread,
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={s.notificationMainButton}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={cx(
                                    s.notificationDot,
                                    unread ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className={s.notificationTitle}>
                                      {notification.title}
                                    </p>
                                    <span className={s.notificationTime}>
                                      {formatNotificationTime(notification.created_at)}
                                    </span>
                                  </div>

                                  <p className={s.notificationMessage}>
                                    {notification.message}
                                  </p>

                                  {href ? (
                                    <p className="text-main mt-1 text-xs">
                                      Open related item
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
                                className={s.readButton}
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
              <button onClick={() => setActionsOpen((prev) => !prev)} className={s.btn}>
                Menu ▾
              </button>

              {actionsOpen && (
                <div className={s.dropdown}>
                  {isAdminUser && (
                    <button
                      onClick={() => {
                        setActionsOpen(false);
                        setInviteModalOpen(true);
                      }}
                      className={s.dropdownButton}
                    >
                      Invite User
                    </button>
                  )}

                  <button onClick={handleToggleTheme} className={s.dropdownButton}>
                    Toggle Theme
                  </button>

                  <div className="border-base my-1 border-t" />

                  <button
                    onClick={handleLogout}
                    className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500"
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
              className={cx(s.btn, "md:hidden")}
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={s.mobileMenuWrap}>
            <nav className={s.mobileMenu}>
              <div className={s.mobileSectionLabel}>Workflow</div>
              {primaryNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      s.mobileNavItem,
                      active ? s.navItemActive : s.navItemInactive,
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {secondaryNavItems.length > 0 && (
                <>
                  <div className={s.mobileSectionDivider} />
                  <div className={s.mobileSectionLabel}>Tools</div>

                  {secondaryNavItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                          s.mobileNavItem,
                          active ? s.navItemActive : s.navItemInactive,
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              )}

              <div className={s.mobileSectionDivider} />
              <div className={s.mobileSectionLabel}>Account</div>

              {isAdminUser && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="hover:bg-accent-soft block w-full rounded-md px-3 py-2 text-left text-sm"
                >
                  Invite User
                </button>
              )}

              <button
                onClick={handleToggleTheme}
                className="hover:bg-accent-soft block w-full rounded-md px-3 py-2 text-left text-sm"
              >
                Toggle Theme
              </button>

              <button
                onClick={handleLogout}
                className="hover:bg-accent-soft block w-full rounded-md px-3 py-2 text-left text-sm text-red-500"
              >
                Log out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className={s.main}>
        <div className={s.mainInner}>
          {title ? <h1 className={s.h1}>{title}</h1> : null}
          {children}
        </div>
      </main>

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}

const s = {
  app: "min-h-screen bg-app text-main",

  header:
    "sticky top-0 z-20 border-b border-base bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80",
  headerInner: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3",

  left: "flex min-w-0 items-center gap-3 lg:gap-6",
  brand: "shrink-0 text-lg font-semibold tracking-tight",

  navDesktopWide: "hidden items-center gap-2 xl:flex",
  navDesktopMedium: "hidden items-center gap-2 md:flex xl:hidden",

  navItem: "whitespace-nowrap rounded-md px-3 py-2 text-sm transition",
  navItemActive: "bg-accent-soft text-main",
  navItemInactive: "text-muted hover:bg-accent-soft",

  right: "flex shrink-0 items-center gap-2",
  rightSlot: "hidden items-center gap-2 lg:flex",

  btn: "inline-flex items-center justify-center rounded-md border border-base bg-surface px-3 py-2 text-sm hover:bg-accent-soft",
  iconButton:
    "relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-base bg-surface text-base hover:bg-accent-soft",

  badge:
    "absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-main px-1 text-[10px] font-semibold text-white",
  bellIcon: "leading-none",

  dropdown:
    "bg-surface absolute right-0 z-50 mt-2 min-w-[12rem] rounded-lg border border-base shadow-lg",
  dropdownItem: "block w-full px-4 py-2 text-left text-sm",
  dropdownButton: "hover:bg-muted w-full px-4 py-2 text-left text-sm",

  notificationsDropdown:
    "bg-surface absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-base shadow-lg",
  notificationsHeader:
    "flex items-start justify-between gap-3 border-b border-base px-4 py-3",
  notificationsList: "max-h-[24rem] overflow-y-auto",
  notificationsEmpty: "px-4 py-6 text-sm text-muted text-center",

  notificationItem: "border-b border-base last:border-b-0",
  notificationItemUnread: "bg-accent-soft/40",
  notificationMainButton:
    "block w-full px-4 py-3 text-left transition hover:bg-accent-soft/60",
  notificationDot: "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-main transition-opacity",
  notificationTitle: "truncate text-sm font-medium",
  notificationMessage: "mt-1 text-sm text-muted",
  notificationTime: "shrink-0 text-xs text-muted",
  readButton: "px-4 pb-3 text-xs text-muted hover:text-main hover:underline",

  inlineAction: "text-xs text-muted hover:text-main transition",

  mobileMenuWrap: "border-t border-base px-4 pb-3 md:hidden",
  mobileMenu: "mx-auto flex max-w-6xl flex-col gap-2 pt-3",
  mobileNavItem: "rounded-md px-3 py-2 text-sm transition",
  mobileSectionLabel:
    "px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted",
  mobileSectionDivider: "border-base mt-2 border-t pt-2",

  main: "mx-auto max-w-6xl px-4 py-6",
  mainInner: "space-y-6",

  h1: "text-2xl font-semibold",
};
