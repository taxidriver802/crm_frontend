"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ConfirmModal } from "@/components/modals/confirm-modal";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { CommandPalette } from "@/components/command-palette";
import { Overlay } from "@/components/ui/overlay";
import { Icon } from "@/components/icons";
import { ReturnBackButton, ReturnToProvider } from "@/components/return-to";
import { clearReturnStack } from "@/lib/return-to";
import { recordRecentFromPathname, parseEntityContext } from "@/lib/search-recents";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { NAV_ITEMS } from "@/lib/preferences";
import { CompanyMark } from "@/components/brand/company-mark";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/workspace-provider";
import { PeekProvider } from "@/components/peek/peek-provider";
import { PeekPanel } from "@/components/peek/peek-panel";
import { DockPanel } from "@/components/workspace/dock-panel";
import { HelpProvider, useHelp } from "@/components/help/help-provider";
import { useModChord } from "@/lib/mod-key";
import { HelpPanel } from "@/components/help/help-panel";
import { NavList, NavRail, isActivePath, useNavItems } from "@/components/shell/nav-rail";
import { NotificationsMenu } from "@/components/shell/notifications-menu";
import { CreateMenu } from "@/components/shell/create-menu";
import { useMediaQuery } from "@/lib/use-media-query";
import { Avatar } from "@/components/shell/user-menu";
import { ShortcutsDialog, useGlobalShortcuts } from "@/components/shell/shortcuts";

const RAIL_STORAGE_KEY = "crm-desktop-sidebar";
const RAIL_EVENT = "crm-railchange";

function subscribeRail(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(RAIL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(RAIL_EVENT, callback);
  };
}

function readRailCollapsed() {
  try {
    return window.localStorage.getItem(RAIL_STORAGE_KEY) === "0";
  } catch {
    return false;
  }
}

function writeRailCollapsed(collapsed) {
  try {
    window.localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? "0" : "1");
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(RAIL_EVENT));
}

const EMPTY_CHROME = {
  title: undefined,
  description: undefined,
  right: null,
  back: undefined,
};

const ChromeDispatchContext = createContext(() => {});
const ChromeValueContext = createContext(EMPTY_CHROME);

function sameChrome(a, b) {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.right === b.right &&
    a.back === b.back
  );
}

function isBarePath(pathname) {
  if (!pathname || pathname === "/") return true;
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/accept-invite" ||
    pathname === "/public" ||
    pathname.startsWith("/public/")
  );
}

const StablePage = memo(function StablePage({ children }) {
  return children;
});

/** "Jobs" above a job's name, so a record always shows where it lives. */
function crumbFor(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === "estimates") return null;
  const item = NAV_ITEMS.find((nav) => nav.href === `/${parts[0]}`);
  return item ? { label: item.label, href: item.href } : null;
}

function OfflineBanner() {
  // "offline": the browser has no network. "unreachable": the browser is
  // online but a request could not reach the CRM server. The second clears
  // as soon as any request gets through, not only on a browser online event.
  const [state, setState] = useState(null);

  useEffect(() => {
    function syncOnline() {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setState(offline ? "offline" : null);
    }
    function onApiOffline() {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setState(offline ? "offline" : "unreachable");
    }
    function onApiOnline() {
      setState((s) => (s === "unreachable" ? null : s));
    }
    syncOnline();
    window.addEventListener("offline", syncOnline);
    window.addEventListener("online", syncOnline);
    window.addEventListener("crm-offline", onApiOffline);
    window.addEventListener("crm-online", onApiOnline);
    return () => {
      window.removeEventListener("offline", syncOnline);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("crm-offline", onApiOffline);
      window.removeEventListener("crm-online", onApiOnline);
    };
  }, []);

  if (!state) return null;

  return (
    <div className="shrink-0 border-b border-base px-4 py-2 sm:px-6">
      <Alert tone="warning" className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {state === "offline"
            ? "You’re offline. Data needs a connection."
            : "Can’t reach the CRM right now. Changes may not be saved."}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>
          Retry
        </button>
      </Alert>
    </div>
  );
}

/** iOS: keep the shell at the visual viewport height and stop rubber-banding. */
function useViewportLock() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let lastTouchY = 0;

    function syncViewport() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
    }
    function pinDocumentScroll() {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    }
    function findScrollable(target, axis) {
      let node = target instanceof Element ? target : target?.parentElement;
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const overflow = axis === "y" ? style.overflowY : style.overflowX;
        const scrolls =
          axis === "y"
            ? node.scrollHeight > node.clientHeight + 1
            : node.scrollWidth > node.clientWidth + 1;
        if ((overflow === "auto" || overflow === "scroll") && scrolls) return node;
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
      const atBottom = vertical.scrollTop + vertical.clientHeight >= vertical.scrollHeight - 1;
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) event.preventDefault();
    }

    root.classList.add("app-shell-active");
    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener("scroll", pinDocumentScroll, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      vv?.removeEventListener("resize", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener("scroll", pinDocumentScroll);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      root.classList.remove("app-shell-active");
      root.style.removeProperty("--app-height");
    };
  }, []);
}

function MobileTabBar({ entityContext, createOpen, onCreateOpenChange }) {
  const pathname = usePathname();
  const { work } = useNavItems();
  // The person's own first four work destinations, with Create in the middle.
  const items = work.filter((item) => item.id !== "inbox").slice(0, 4);
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  function renderItem(item) {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => clearReturnStack()}
        className={cx("tabbar-item", active && "tabbar-item-active")}
        aria-current={active ? "page" : undefined}
      >
        <Icon name={item.icon} className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="tabbar lg:hidden" aria-label="Primary">
      {left.map(renderItem)}
      <div className="tabbar-create">
        <CreateMenu
          entityContext={entityContext}
          compact
          side="top"
          align="center"
          open={createOpen}
          onOpenChange={onCreateOpenChange}
        />
      </div>
      {right.map(renderItem)}
    </nav>
  );
}

function AppShellFrame({ children }) {
  const { title, description, right, back } = useContext(ChromeValueContext);
  const pathname = usePathname();
  const router = useRouter();
  const { user, company, isAdmin, prefs, loaded, updatePrefs } = useWorkspace();
  const help = useHelp();
  const searchChord = useModChord("K");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  // Two Create buttons exist (rail, tab bar); only the visible one is driven by
  // the shortcut, so the hidden one's outside-click handling cannot close it.
  const wide = useMediaQuery("(min-width: 1024px)");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useViewportLock();

  // The tab names the company you are signed in to, not the app's default.
  // Next writes the layout's metadata title after loads and navigations, so
  // put the company's back whenever the title changes.
  useEffect(() => {
    if (!company?.name) return undefined;
    const wanted = `${company.name} CRM`;
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [company?.name]);

  // The rail paints from localStorage first (no flash; layout.js marks
  // <html data-sidebar>) and then follows the saved preference once loaded.
  const localCollapsed = useSyncExternalStore(subscribeRail, readRailCollapsed, () => false);
  useLayoutEffect(() => {
    delete document.documentElement.dataset.sidebar;
  }, []);
  const collapsed =
    loaded && prefs.nav?.collapsed !== undefined && prefs.nav?.collapsed !== null
      ? Boolean(prefs.nav.collapsed)
      : localCollapsed;

  const toggleRail = useCallback(() => {
    const next = !collapsed;
    writeRailCollapsed(next);
    updatePrefs({ nav: { collapsed: next } });
  }, [collapsed, updatePrefs]);

  // A new page starts with every transient surface closed.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setCreateOpen(false);
    setInviteModalOpen(false);
    setLogoutConfirmOpen(false);
  }

  useEffect(() => {
    recordRecentFromPathname(pathname);
  }, [pathname]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  // One open state drives both Create buttons; only the one on screen is visible.
  const openCreate = useCallback(() => setCreateOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const openGuide = help.openHelp;

  useGlobalShortcuts({
    onSearch: openSearch,
    onCreate: openCreate,
    onToggleRail: toggleRail,
    onHelp: openShortcuts,
  });

  const entityContext = useMemo(() => parseEntityContext(pathname), [pathname]);
  const crumb = useMemo(() => crumbFor(pathname), [pathname]);

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <ReturnToProvider title={title}>
      <div className="app-shell workbench">
        <NavRail
          collapsed={collapsed}
          onToggle={toggleRail}
          unread={unread}
          entityContext={entityContext}
          createOpen={wide ? createOpen : undefined}
          onCreateOpenChange={wide ? setCreateOpen : undefined}
          onSearch={openSearch}
          onInvite={() => setInviteModalOpen(true)}
          onShortcuts={openShortcuts}
          onHelp={() => openGuide()}
          onLogout={() => setLogoutConfirmOpen(true)}
        />

        <div className="workspace">
          <header className="topbar" role="banner">
            <div className="topbar-left">
              <Link href="/dashboard" className="topbar-brand lg:hidden" aria-label={company?.name || "Today"}>
                <CompanyMark markId={company?.mark_id} logoUrl={company?.logo_url} className="h-7 w-7" alt="" />
              </Link>
              <ReturnBackButton back={back} />
              <div className={cx("topbar-title", !description && !crumb && "justify-center")}>
                {crumb && title ? (
                  <Link href={crumb.href} className="crumb" onClick={() => clearReturnStack()}>
                    {crumb.label}
                  </Link>
                ) : null}
                {title ? <h1 className="topbar-h1">{title}</h1> : null}
                {description ? <p className="topbar-sub">{description}</p> : null}
              </div>
            </div>

            <div className="topbar-right">
              {right ? <div className="hidden min-w-0 items-center gap-2 lg:flex lg:flex-wrap">{right}</div> : null}
              <button
                type="button"
                onClick={openSearch}
                aria-label="Open search"
                title={`Search (${searchChord})`}
                className="icon-btn icon-btn-quiet lg:hidden"
              >
                <Icon name="search" className="h-4 w-4" />
              </button>
              <NotificationsMenu onUnreadChange={setUnread} />
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="icon-btn icon-btn-quiet menu-trigger lg:hidden"
              >
                <Icon name={mobileMenuOpen ? "close" : "menu"} className="h-4 w-4" />
              </button>
            </div>
          </header>

          <OfflineBanner />

          {mobileMenuOpen ? (
            <>
              <Overlay className="lg:hidden" aria-hidden onClick={() => setMobileMenuOpen(false)} />
              <div className="mobile-menu sheet lg:hidden" role="dialog" aria-label="Menu">
                <div className="sheet-head">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar user={user} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Menu"}
                      </div>
                      <div className="truncate text-xs text-muted">{company?.name}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    aria-label="Close menu"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
                <div className="sheet-body scrollbar-theme">
                  <NavList unread={unread} onNavigate={() => setMobileMenuOpen(false)} />
                  <div className="rail-group border-t border-base pt-3">
                    <Link href="/settings" className="rail-link" onClick={() => setMobileMenuOpen(false)}>
                      <Icon name="sliders" className="h-[1.05rem] w-[1.05rem]" />
                      <span>Preferences</span>
                    </Link>
                    <button
                      type="button"
                      className="rail-link"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openGuide();
                      }}
                    >
                      <Icon name="help" className="h-[1.05rem] w-[1.05rem]" />
                      <span>Help</span>
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="rail-link"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setInviteModalOpen(true);
                        }}
                      >
                        <Icon name="userPlus" className="h-[1.05rem] w-[1.05rem]" />
                        <span>Invite someone</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rail-link text-danger"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                    >
                      <Icon name="logOut" className="h-[1.05rem] w-[1.05rem]" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <main className="workspace-main scrollbar-none" id="main">
            <div className="page-wrap">
              <div className="page-stack">
                {right ? <div className="page-actions lg:hidden">{right}</div> : null}
                {children}
              </div>
            </div>
          </main>

          <MobileTabBar
            entityContext={entityContext}
            createOpen={wide ? undefined : createOpen}
            onCreateOpenChange={wide ? undefined : setCreateOpen}
          />
        </div>

        <DockPanel />
        <PeekPanel />
        <HelpPanel />

        <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
        <ConfirmModal
          open={logoutConfirmOpen}
          onClose={() => setLogoutConfirmOpen(false)}
          onConfirm={handleLogout}
          title="Log out?"
          description="You can sign back in anytime. Your workspace layout is saved to your account."
          confirmLabel="Log out"
          cancelLabel="Cancel"
          tone="danger"
        />
        <ShortcutsDialog
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
          onOpenHelp={() => {
            setShortcutsOpen(false);
            openGuide();
          }}
        />
        <CommandPalette
          open={searchOpen}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          autoFocus
          showInput
          externalKeyDownRef={null}
          entityContext={entityContext}
          isAdminUser={isAdmin}
          helpArticles={help.articles}
          onOpenHelp={openGuide}
          onInviteUser={() => setInviteModalOpen(true)}
          onMarkAllNotificationsRead={async () => {
            await api("/notifications/read-all", { method: "PATCH" }).catch(() => {});
            setUnread(0);
          }}
        />
      </div>
    </ReturnToProvider>
  );
}

export function AppShell({ children, title, description, right, back }) {
  const setChrome = useContext(ChromeDispatchContext);

  useLayoutEffect(() => {
    setChrome({ title, description, right: right ?? null, back });
  }, [title, description, right, back, setChrome]);

  useLayoutEffect(() => () => setChrome(EMPTY_CHROME), [setChrome]);

  return children;
}

export function ShellGate({ children }) {
  const pathname = usePathname();
  const [chrome, setChrome] = useState(EMPTY_CHROME);
  const setChromeStable = useCallback((next) => {
    setChrome((prev) => (sameChrome(prev, next) ? prev : next));
  }, []);

  if (isBarePath(pathname)) return children;

  return (
    <ChromeDispatchContext.Provider value={setChromeStable}>
      <ChromeValueContext.Provider value={chrome}>
        <WorkspaceProvider>
          <PeekProvider>
            <HelpProvider>
              <AppShellFrame>
                <StablePage>{children}</StablePage>
              </AppShellFrame>
            </HelpProvider>
          </PeekProvider>
        </WorkspaceProvider>
      </ChromeValueContext.Provider>
    </ChromeDispatchContext.Provider>
  );
}

export { isActivePath };
