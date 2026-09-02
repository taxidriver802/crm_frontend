"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "./toast/toast-provider";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { Overlay } from "@/components/ui/overlay";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";

import MainLogo from "@/assets/mainlogo.svg";
import { api } from "@/lib/api";

const WORKFLOW_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "home", priority: "primary" },
  { href: "/leads", label: "Leads", icon: "users", priority: "primary" },
  { href: "/jobs", label: "Jobs", icon: "briefcase", priority: "primary" },
  { href: "/tasks", label: "Tasks", icon: "checklist", priority: "primary" },
  { href: "/invoices", label: "Invoices", icon: "invoice", priority: "primary" },
];

const SYSTEM_NAV = [
  { href: "/files", label: "Files", icon: "folder", priority: "secondary" },
  { href: "/reports", label: "Reports", icon: "chart", priority: "secondary" },
  { href: "/automation", label: "Automation", icon: "spark", priority: "secondary" },
  { href: "/integrations", label: "Integrations", icon: "plug", priority: "secondary" },
];

const USERS_NAV = { href: "/users", label: "Users", icon: "users", priority: "secondary" };

const DESKTOP_SIDEBAR_STORAGE_KEY = "crm-desktop-sidebar";

function readDesktopSidebarOpen() {
  try {
    return localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeDesktopSidebarOpen(open) {
  try {
    localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
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

  if (notification.entity_type === "estimate" && notification.entity_id) {
    return `/estimates/${notification.entity_id}`;
  }

  if (notification.entity_type === "invoice" && notification.entity_id) {
    return `/invoices/${notification.entity_id}`;
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const [user, setUser] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const notificationsOpenRef = useRef(false);
  const prevNotificationsRef = useRef([]);

  useEffect(() => {
    notificationsOpenRef.current = notificationsOpen;
  }, [notificationsOpen]);

  useEffect(() => {
    setDesktopSidebarOpen(readDesktopSidebarOpen());
  }, []);

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
    function onShortcut(event) {
      const isK = event.key?.toLowerCase() === "k";
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isK || !isMeta) return;
      event.preventDefault();
      setSearchOpen(true);
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
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
    if (notification.entity_type === "estimate") return "Open estimate";
    if (notification.entity_type === "invoice") return "Open invoice";
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

  function renderNavLink(item, { onNavigate, tone = "chrome" } = {}) {
    const active = isActivePath(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cx(
          tone === "chrome"
            ? "nav-chrome"
            : "flex items-center gap-2.5 rounded-theme-md px-2.5 py-2 text-sm transition",
          tone === "chrome"
            ? active && "nav-chrome-active"
            : active
              ? "bg-accent text-main font-medium"
              : "text-muted hover:bg-accent",
        )}
      >
        {item.icon ? <Icon name={item.icon} className="h-4 w-4" /> : null}
        {item.label}
      </Link>
    );
  }

  function renderNotificationsPanel() {
    return (
      <div
        className={cx(
          "dropdown-panel z-50 flex max-h-[min(85dvh,32rem)] min-h-0 flex-col overflow-hidden shadow-lg",
          /* Small screens: pin to viewport so the panel never hangs off the left edge */
          "fixed inset-x-3 top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] w-auto",
          /* sm+: anchor to bell, cap width so medium layouts stay lighter */
          "sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(75vh,28rem)] sm:w-[min(20rem,calc(100vw-2rem))]",
          "lg:w-[min(22rem,calc(100vw-2rem))]",
        )}
      >
        <div className="border-base flex flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-muted text-xs">Recent activity and reminders</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
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

        <div className="scrollbar-theme min-h-0 flex-1 overflow-y-auto">
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
      {/* SIDEBAR — large screens; toggled from the topbar */}
      <aside
        id="desktop-sidebar"
        aria-hidden={!desktopSidebarOpen}
        inert={!desktopSidebarOpen ? true : undefined}
        className={cx(
          "scrollbar-theme bg-chrome text-chrome hidden h-full shrink-0 flex-col overflow-hidden lg:flex",
          desktopSidebarOpen ? "w-64 border-chrome border-r" : "w-0 border-0",
        )}
        style={{
          transitionProperty: "width, border-width",
          transitionDuration: "var(--duration-fast)",
          transitionTimingFunction: "var(--ease-standard)",
        }}
      >
        <div className="flex h-full w-64 min-w-64 flex-col">
          <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
            <MainLogo className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-tight">CRM</span>
          </Link>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-2">
            <div className="space-y-0.5">
              {primaryNavItems.map((item) => renderNavLink(item))}
            </div>

            {secondaryNavItems.length > 0 && (
              <div className="space-y-0.5">
                <div className="nav-section-label">Tools</div>
                {secondaryNavItems.map((item) => renderNavLink(item))}
              </div>
            )}
          </nav>

          <div className="border-chrome space-y-2 border-t p-3">
            {isAdminUser && (
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="btn btn-chrome w-full justify-start"
              >
                <Icon name="userPlus" className="h-4 w-4" />
                Invite user
              </button>
            )}

            <ThemeToggle className="btn-chrome w-full justify-start" />

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-chrome w-full justify-start"
            >
              <Icon name="logOut" className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="border-base bg-surface-elevated relative sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-4 py-2.5 sm:px-6">
          <div
            className={cx(
              "flex h-full min-w-0 flex-row gap-2",
              !description ? "items-center" : "items-start",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setDesktopSidebarOpen((open) => {
                  const next = !open;
                  writeDesktopSidebarOpen(next);
                  return next;
                });
              }}
              className="icon-btn hidden lg:inline-flex"
              aria-label={desktopSidebarOpen ? "Collapse menu" : "Open menu"}
              aria-expanded={desktopSidebarOpen}
              aria-controls="desktop-sidebar"
              title={desktopSidebarOpen ? "Collapse menu" : "Open menu"}
            >
              <Icon
                name={desktopSidebarOpen ? "chevronLeft" : "menu"}
                className="h-4 w-4"
              />
            </button>
            <div className={cx("flex min-w-0 flex-col", !description && "justify-center")}>
              {title ? (
                <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
              ) : null}
              {description ? (
                <p className="text-muted mt-0.5 truncate text-sm">{description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {right ? (
              <div className="hidden items-center gap-2 lg:flex">{right}</div>
            ) : null}

            <div className="notifications-menu relative">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                className="icon-btn"
                title="Search (Ctrl/Cmd + K)"
              >
                <Icon name="search" className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleNotifications}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="icon-btn relative ml-1.5"
              >
                <Icon name="bell" className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="bg-accent-solid text-on-accent absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold">
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
              className="icon-btn menu-trigger lg:hidden"
            >
              <Icon name={mobileMenuOpen ? "close" : "menu"} className="h-4 w-4" />
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <Overlay
              className="lg:hidden"
              aria-hidden
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="mobile-menu dropdown-panel fixed right-3 top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] z-50 flex max-h-[min(70vh,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden lg:hidden">
              <div className="border-base flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold tracking-tight">Menu</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <div className="scrollbar-theme min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
                <div className="space-y-0.5">
                  <div className="text-muted px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Workflow
                  </div>
                  {primaryNavItems.map((item) =>
                    renderNavLink(item, {
                      onNavigate: () => setMobileMenuOpen(false),
                      tone: "panel",
                    }),
                  )}
                </div>

                {secondaryNavItems.length > 0 && (
                  <>
                    <div className="border-base border-t pt-2" />
                    <div className="space-y-0.5">
                      <div className="text-muted px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                        Tools
                      </div>
                      {secondaryNavItems.map((item) =>
                        renderNavLink(item, {
                          onNavigate: () => setMobileMenuOpen(false),
                          tone: "panel",
                        }),
                      )}
                    </div>
                  </>
                )}

                <div className="border-base space-y-2 border-t pt-3">
                  <div className="text-muted px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
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
                      <Icon name="userPlus" className="h-4 w-4" />
                      Invite user
                    </button>
                  )}

                  <ThemeToggle className="w-full justify-start" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-danger w-full justify-start"
                  >
                    <Icon name="logOut" className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PAGE */}
        <main className="scrollbar-none flex-1 overflow-y-auto">
          <div className="page-wrap">
            <div className="page-stack">
              {right ? <div className="page-actions lg:hidden">{right}</div> : null}
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="border-chrome bg-chrome text-chrome fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t py-1.5 lg:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {[
          { href: "/dashboard", label: "Home", icon: "home" },
          { href: "/leads", label: "Leads", icon: "users" },
          { href: "/jobs", label: "Jobs", icon: "briefcase" },
          { href: "/tasks", label: "Tasks", icon: "checklist" },
          { href: "/reports", label: "Reports", icon: "chart" },
        ].map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex min-w-[3.25rem] flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition",
                active ? "text-chrome font-semibold" : "text-chrome-muted",
              )}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
