"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { CompanyMark } from "@/components/brand/company-mark";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { clearReturnStack } from "@/lib/return-to";
import { resolveNav } from "@/lib/preferences";
import { cx } from "@/lib/cx";
import { CreateMenu } from "./create-menu";
import { UserMenu } from "./user-menu";

const PIN_ICON = {
  job: "briefcase",
  lead: "users",
  task: "checklist",
  invoice: "dollar",
  estimate: "invoice",
  view: "list",
};

export function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function useNavItems() {
  const { prefs, role } = useWorkspace();
  const items = resolveNav(prefs.nav, role).filter((item) => !item.hidden);
  return {
    work: items.filter((item) => item.group === "work"),
    tools: items.filter((item) => item.group === "tools"),
    all: items,
  };
}

function NavLink({ item, collapsed, badge, onNavigate }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={() => {
        clearReturnStack();
        onNavigate?.();
      }}
      className={cx("rail-link", active && "rail-link-active", collapsed && "rail-link-collapsed")}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      data-nav={item.id}
    >
      <Icon name={item.icon} className="h-[1.05rem] w-[1.05rem]" />
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {badge ? (
        <span className={cx("rail-badge", collapsed && "rail-badge-dot")}>{collapsed ? "" : badge}</span>
      ) : null}
    </Link>
  );
}

/** The list of destinations and pins, shared by the desktop rail and the mobile sheet. */
export function NavList({ collapsed = false, unread = 0, onNavigate }) {
  const { prefs, updatePrefs } = useWorkspace();
  const pathname = usePathname();
  const { work, tools } = useNavItems();
  const pins = prefs.nav?.pins || [];

  function unpin(id) {
    updatePrefs({ nav: { pins: pins.filter((pin) => pin.id !== id) } });
  }

  return (
    <nav aria-label="Workspace" className="rail-nav">
      <div className="rail-group">
        {work.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
            badge={item.id === "inbox" && unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null}
          />
        ))}
      </div>

      {pins.length > 0 ? (
        <div className="rail-group">
          {collapsed ? <div className="rail-rule" /> : <div className="rail-label">Pinned</div>}
          {pins.map((pin) => {
            // A pinned record is active on its own page. A pinned view shares its
            // list's path with every other filter, so the list's nav item shows
            // where you are and the view pin stays quiet.
            const active = !pin.href.includes("?") && pathname === pin.href;
            return (
              <div key={pin.id} className="rail-pin group">
                <Link
                  href={pin.href}
                  onClick={() => {
                    clearReturnStack();
                    onNavigate?.();
                  }}
                  className={cx("rail-link", active && "rail-link-active", collapsed && "rail-link-collapsed")}
                  title={collapsed ? pin.label : undefined}
                >
                  <Icon name={PIN_ICON[pin.kind] || "pin"} className="h-[1.05rem] w-[1.05rem]" />
                  {collapsed ? null : <span className="min-w-0 flex-1 truncate">{pin.label}</span>}
                </Link>
                {collapsed ? null : (
                  <button
                    type="button"
                    className="rail-unpin"
                    aria-label={`Unpin ${pin.label}`}
                    onClick={() => unpin(pin.id)}
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {tools.length > 0 ? (
        <div className="rail-group">
          {collapsed ? <div className="rail-rule" /> : <div className="rail-label">Tools</div>}
          {tools.map((item) => (
            <NavLink key={item.id} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </nav>
  );
}

export function NavRail({
  collapsed,
  onToggle,
  unread,
  entityContext,
  createOpen,
  onCreateOpenChange,
  onSearch,
  onInvite,
  onShortcuts,
  onHelp,
  onLogout,
}) {
  const { company } = useWorkspace();

  return (
    <aside
      id="desktop-sidebar"
      className={cx("rail", collapsed && "rail-collapsed")}
      aria-label="Sidebar"
    >
      <div className="rail-head">
        <Link href="/dashboard" className="rail-brand" onClick={() => clearReturnStack()} title={company?.name}>
          <CompanyMark markId={company?.mark_id} logoUrl={company?.logo_url} className="h-7 w-7" alt="" />
          {collapsed ? null : <span className="truncate">{company?.name || "Workspace"}</span>}
        </Link>
        <button
          type="button"
          className="icon-btn icon-btn-quiet rail-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="desktop-sidebar"
          title={`${collapsed ? "Expand" : "Collapse"} sidebar ([)`}
        >
          <Icon name="panelLeft" className="h-4 w-4" />
        </button>
      </div>

      <div className={cx("rail-actions", collapsed && "rail-actions-collapsed")}>
        <CreateMenu
          entityContext={entityContext}
          open={createOpen}
          onOpenChange={onCreateOpenChange}
          compact={collapsed}
        />
        <button
          type="button"
          className={cx("rail-search", collapsed && "rail-search-collapsed")}
          onClick={onSearch}
          aria-label="Open search"
          title="Search (⌘K)"
        >
          <Icon name="search" className="h-4 w-4" />
          {collapsed ? null : (
            <>
              <span>Search</span>
              <kbd className="kbd ml-auto">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <div className="rail-scroll scrollbar-theme">
        <NavList collapsed={collapsed} unread={unread} />
      </div>

      <div className="rail-foot">
        <UserMenu
          collapsed={collapsed}
          onInvite={onInvite}
          onShortcuts={onShortcuts}
          onHelp={onHelp}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
}
