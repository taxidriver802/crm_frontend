"use client";

import { Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "./toast/toast-provider";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { Overlay } from "@/components/ui/overlay";
import { Icon } from "@/components/icons";
import { ReturnBackButton, ReturnToProvider } from "@/components/return-to";
import { clearReturnStack } from "@/lib/return-to";
import { recordRecentFromPathname, parseEntityContext } from "@/lib/search-recents";
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
const TEMPLATES_NAV = {
  href: "/estimates/templates",
  label: "Templates",
  icon: "invoice",
  priority: "secondary",
};

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

function AccountSettings({ tone = "default", isAdminUser, onInvite, onLogout }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const chrome = tone === "chrome";

  return (
    <div>
      <button
        type="button"
        className={cx("btn w-full justify-start", chrome && "btn-chrome")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="settings" className="h-4 w-4" />
        Settings
        <Icon
          name="chevronDown"
          className={cx(
            "ml-auto h-3.5 w-3.5 transition-transform duration-fast",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className={cx(
            "mt-1 space-y-1 rounded-theme-md border p-1",
            chrome ? "border-chrome" : "border-base",
          )}
        >
          {isAdminUser ? (
            <button
              type="button"
              onClick={onInvite}
              className={cx("btn w-full justify-start", chrome && "btn-chrome")}
            >
              <Icon name="userPlus" className="h-4 w-4" />
              Invite user
            </button>
          ) : null}

          <ThemeToggle tone={tone} />

          <button
            type="button"
            onClick={onLogout}
            className={cx(
              "btn w-full justify-start",
              chrome ? "btn-chrome" : "btn-danger",
            )}
          >
            <Icon name="logOut" className="h-4 w-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
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

function getNotificationIconName(notification) {
  if (!notification) return "bell";

  switch (notification.entity_type) {
    case "task":
      return "checklist";
    case "lead":
      return "users";
    case "job":
      return "briefcase";
    case "estimate":
    case "invoice":
      return "invoice";
    case "invite":
      return "userPlus";
    default:
      break;
  }

  if (notification.type === "FILE_UPLOADED") return "folder";
  return "bell";
}

export function AppShell({ children, title, description, right, back }) {
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSurface, setSearchSurface] = useState("palette");
  const topbarSearchRef = useRef(null);
  const searchKeyDownRef = useRef(null);

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
    recordRecentFromPathname(pathname);
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
      const useTopbar =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      setSearchSurface(useTopbar ? "topbar" : "palette");
      setSearchOpen(true);
      if (useTopbar) {
        requestAnimationFrame(() => topbarSearchRef.current?.focus());
      }
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchSurface("palette");
  }

  function openSearchFromTopbar() {
    setSearchSurface("topbar");
    setSearchOpen(true);
  }

  function openSearchFromIcon() {
    setSearchSurface("palette");
    setSearchOpen(true);
  }

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
    // Polling interval; loaders close over latest state via refs/setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdminUser = user?.role === "owner" || user?.role === "admin";
  const entityContext = useMemo(() => parseEntityContext(pathname), [pathname]);

  const navItems = useMemo(() => {
    const systemNav = [
      SYSTEM_NAV[0],
      SYSTEM_NAV[1],
      SYSTEM_NAV[2],
      ...(isAdminUser ? [TEMPLATES_NAV] : []),
      SYSTEM_NAV[3],
    ];
    return isAdminUser
      ? [...WORKFLOW_NAV, ...systemNav, USERS_NAV]
      : [...WORKFLOW_NAV, ...systemNav];
  }, [isAdminUser]);

  const primaryNavItems = navItems.filter((item) => item.priority === "primary");
  const secondaryNavItems = navItems.filter((item) => item.priority === "secondary");

  useEffect(() => {
    loadUser();
    loadUnreadCount();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    let lastTouchY = 0;

    function syncViewport() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
    }

    function pinDocumentScroll() {
      if (window.scrollX || window.scrollY) {
        window.scrollTo(0, 0);
      }
    }

    function findScrollable(target, axis) {
      let node = target instanceof Element ? target : target?.parentElement;
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        if (axis === "y") {
          const overflowY = style.overflowY;
          if (
            (overflowY === "auto" || overflowY === "scroll") &&
            node.scrollHeight > node.clientHeight + 1
          ) {
            return node;
          }
        } else {
          const overflowX = style.overflowX;
          if (
            (overflowX === "auto" || overflowX === "scroll") &&
            node.scrollWidth > node.clientWidth + 1
          ) {
            return node;
          }
        }
        node = node.parentElement;
      }
      return null;
    }

    function onTouchStart(event) {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    }

    function onTouchMove(event) {
      if (event.touches.length > 1) return;

      const y = event.touches[0]?.clientY ?? lastTouchY;
      const deltaY = y - lastTouchY;
      lastTouchY = y;

      const horizontal = findScrollable(event.target, "x");
      const vertical = findScrollable(event.target, "y");

      if (horizontal && !vertical) return;
      if (!vertical) {
        event.preventDefault();
        return;
      }

      const atTop = vertical.scrollTop <= 0;
      const atBottom =
        vertical.scrollTop + vertical.clientHeight >= vertical.scrollHeight - 1;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    }

    root.classList.add("app-shell-active");
    syncViewport();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener("scroll", pinDocumentScroll, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      visualViewport?.removeEventListener("resize", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener("scroll", pinDocumentScroll);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      root.classList.remove("app-shell-active");
      root.style.removeProperty("--app-height");
    };
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
      clearReturnStack();
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
        onClick={(event) => {
          clearReturnStack();
          onNavigate?.(event);
        }}
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
          "dropdown-panel z-50 flex max-h-[min(85dvh,32rem)] min-h-0 flex-col overflow-hidden",
          /* Stronger edge + elevation so the panel reads above page cards without a full-screen dim */
          "border-strong shadow-[0_12px_40px_rgb(15_20_23/0.16)] dark:shadow-[0_16px_48px_rgb(0_0_0/0.55)]",
          /* Small screens: pin to viewport so the panel never hangs off the left edge */
          "fixed inset-x-3 top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] w-auto",
          /* sm+: anchor to bell, cap width so medium layouts stay lighter */
          "sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(75vh,28rem)] sm:w-[min(20rem,calc(100vw-2rem))]",
          "lg:w-[min(22rem,calc(100vw-2rem))]",
        )}
      >
        <div className="border-base flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-sm font-semibold tracking-tight">Notifications</p>
            {unreadCount > 0 ? (
              <span className="bg-accent-solid text-on-accent inline-flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-x-2.5">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAllRead || unreadCount === 0}
              className={cx(
                "text-muted hover:text-main text-xs transition",
                (markingAllRead || unreadCount === 0) && "cursor-not-allowed opacity-50",
              )}
            >
              {markingAllRead ? "Saving..." : "Mark all"}
            </button>

            {hasReadNotifications ? (
              <button
                type="button"
                onClick={handleClearRead}
                className="text-muted hover:text-main text-xs transition"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="scrollbar-theme min-h-0 flex-1 overflow-y-auto py-1">
          {notificationsLoading ? (
            <div className="text-muted flex flex-col items-center gap-2 px-4 py-10 text-center text-sm">
              <Icon name="bell" className="text-soft h-5 w-5" />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-muted flex flex-col items-center gap-2 px-4 py-10 text-center text-sm">
              <Icon name="inbox" className="text-soft h-5 w-5" />
              You’re all caught up.
            </div>
          ) : (
            notifications.map((notification) => {
              const unread = !notification.read_at;
              const iconName = getNotificationIconName(notification);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cx(
                    "hover:bg-accent group relative flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition sm:px-3.5",
                    !unread && "opacity-60 hover:opacity-100",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "bg-accent-solid absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full transition-opacity",
                      unread ? "opacity-100" : "opacity-0",
                    )}
                  />

                  <span
                    className={cx(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-theme-md",
                      unread ? "bg-surface text-muted" : "bg-surface text-soft",
                    )}
                  >
                    <Icon name={iconName} className="h-3.5 w-3.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cx(
                          "truncate text-sm leading-snug",
                          unread ? "text-main font-semibold" : "text-muted font-medium",
                        )}
                      >
                        {notification.title}
                      </p>
                      <span className="text-soft shrink-0 text-[11px] tabular-nums">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                    <p
                      className={cx(
                        "mt-0.5 line-clamp-2 text-xs leading-relaxed",
                        unread ? "text-muted" : "text-soft",
                      )}
                    >
                      {notification.message}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <ReturnToProvider title={title}>
      <div className="app-shell bg-app text-main flex overflow-hidden">
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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-5 py-5"
            onClick={() => clearReturnStack()}
          >
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
            <AccountSettings
              tone="chrome"
              isAdminUser={isAdminUser}
              onInvite={() => setInviteModalOpen(true)}
              onLogout={() => setLogoutConfirmOpen(true)}
            />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className={cx(
          "border-base bg-surface-elevated sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5 sm:px-6",
          searchOpen && searchSurface === "topbar" && "z-[85]",
        )}>
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
                name={desktopSidebarOpen ? "panelLeft" : "menu"}
                className="h-4 w-4"
              />
            </button>
            <Suspense fallback={null}>
              <ReturnBackButton back={back} />
            </Suspense>
            <div className={cx("flex min-w-0 flex-col", !description && "justify-center")}>
              {title ? (
                <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
              ) : null}
              {description ? (
                <p className="text-muted mt-0.5 truncate text-sm">{description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            {right ? (
              <div className="hidden min-w-0 items-center gap-2 lg:flex lg:flex-wrap">
                {right}
              </div>
            ) : null}

            <div className="notifications-menu relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={openSearchFromIcon}
                aria-label="Open search"
                title="Search (Ctrl/Cmd + K)"
                className="icon-btn lg:hidden"
              >
                <Icon name="search" className="h-4 w-4" />
              </button>

              <label
                className={cx(
                  "border-base bg-surface focus-within:border-strong hidden items-center gap-2 rounded-theme-md border px-2.5 transition lg:inline-flex",
                  "h-9 min-w-[12.5rem] max-w-[16rem]",
                  searchOpen && searchSurface === "topbar" && "border-strong bg-accent",
                )}
              >
                <Icon name="search" className="text-muted h-3.5 w-3.5 shrink-0" />
                <input
                  ref={topbarSearchRef}
                  type="search"
                  value={searchQuery}
                  placeholder="Search…"
                  aria-label="Search workspace"
                  className="placeholder:text-soft min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                  onFocus={openSearchFromTopbar}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    openSearchFromTopbar();
                  }}
                  onKeyDown={(event) => {
                    searchKeyDownRef.current?.(event);
                  }}
                />
                <kbd className="border-base text-soft rounded-theme-sm border px-1.5 py-0.5 text-[10px] font-medium">
                  ⌘K
                </kbd>
              </label>

              <button
                type="button"
                onClick={handleToggleNotifications}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="icon-btn relative"
              >
                <Icon name="bell" className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="bg-accent-solid text-on-accent absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen ? (
                <>
                  <Overlay
                    className="sm:hidden"
                    aria-hidden
                    onClick={() => setNotificationsOpen(false)}
                  />
                  {renderNotificationsPanel()}
                </>
              ) : null}
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

                <div className="border-base border-t pt-3">
                  <AccountSettings
                    isAdminUser={isAdminUser}
                    onInvite={() => {
                      setMobileMenuOpen(false);
                      setInviteModalOpen(true);
                    }}
                    onLogout={() => {
                      setMobileMenuOpen(false);
                      setLogoutConfirmOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* PAGE */}
        <main className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-none">
          <div className="page-wrap">
            <div className="page-stack">
              {right ? <div className="page-actions lg:hidden">{right}</div> : null}
              {children}
            </div>
          </div>
        </main>

        {/* MOBILE BOTTOM NAV — in-flow so iOS overscroll cannot drag it off-screen */}
        <nav
          className="border-chrome bg-chrome text-chrome flex shrink-0 items-center justify-around border-t py-1.5 lg:hidden"
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
                onClick={() => clearReturnStack()}
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
      </div>

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <ConfirmModal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Log out?"
        description="Are you sure you want to log out? You can sign back in anytime."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        tone="danger"
      />
      <CommandPalette
        open={searchOpen}
        onClose={closeSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        autoFocus={searchSurface === "palette"}
        showInput={searchSurface === "palette"}
        externalKeyDownRef={searchSurface === "topbar" ? searchKeyDownRef : null}
        entityContext={entityContext}
        isAdminUser={isAdminUser}
        onInviteUser={() => setInviteModalOpen(true)}
        onMarkAllNotificationsRead={handleMarkAllRead}
      />
      </div>
    </ReturnToProvider>
  );
}
