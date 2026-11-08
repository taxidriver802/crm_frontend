"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons";
import { Menu, MenuDivider, MenuItem, MenuLabel } from "@/components/ui/menu";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { usePwaInstall } from "@/lib/pwa";
import { cx } from "@/lib/cx";

export function initialsFor(user) {
  const first = String(user?.first_name || "").trim();
  const last = String(user?.last_name || "").trim();
  const value = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return value || String(user?.email || "?").charAt(0).toUpperCase();
}

export function Avatar({ user, size = "md", className }) {
  return (
    <span className={cx("avatar", size === "sm" && "avatar-sm", className)} aria-hidden>
      {initialsFor(user)}
    </span>
  );
}

const ROLE_LABEL = { owner: "Owner", admin: "Admin", agent: "Agent" };

function Segment({ value, options, onChange, label }) {
  return (
    <div className="menu-segment" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={cx("menu-segment-btn", value === opt.value && "menu-segment-on")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Everything about *you*: how the workspace looks and behaves, and your
 * account. Workspace-wide admin settings live on /settings as well, so this
 * menu stays short.
 */
export function UserMenu({ collapsed, onInvite, onShortcuts, onLogout, side = "top" }) {
  const { user, isAdmin, prefs, updatePrefs } = useWorkspace();
  const { theme } = useTheme();
  const { canInstall, promptInstall } = usePwaInstall();
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "You";

  return (
    <Menu
      side={side}
      align="start"
      label="Your account"
      className="w-72"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className={cx("user-btn", collapsed && "user-btn-collapsed")}
          aria-label="Account and preferences"
          title={collapsed ? name : undefined}
        >
          <Avatar user={user} />
          {collapsed ? null : (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted">{ROLE_LABEL[user?.role] || ""}</span>
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 pb-2 pt-1.5">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-muted">{user?.email}</div>
          </div>
          <MenuDivider />
          <MenuLabel>Theme</MenuLabel>
          <div className="px-2 pb-2">
            <Segment
              label="Theme"
              value={prefs.appearance?.theme && prefs.appearance.theme !== "system" ? prefs.appearance.theme : theme || "system"}
              onChange={(value) => updatePrefs({ appearance: { theme: value } })}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "Auto" },
              ]}
            />
          </div>
          <MenuLabel>Density</MenuLabel>
          <div className="px-2 pb-2">
            <Segment
              label="Density"
              value={prefs.appearance?.density || "comfortable"}
              onChange={(value) => updatePrefs({ appearance: { density: value } })}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </div>
          <MenuDivider />
          <MenuItem
            as={Link}
            href="/settings"
            onSelect={close}
            icon={<Icon name="sliders" className="h-4 w-4 text-muted" />}
          >
            Preferences
          </MenuItem>
          <MenuItem
            onSelect={() => {
              close();
              onShortcuts?.();
            }}
            icon={<Icon name="keyboard" className="h-4 w-4 text-muted" />}
            hint="?"
          >
            Keyboard shortcuts
          </MenuItem>
          {isAdmin ? (
            <>
              <MenuItem
                onSelect={() => {
                  close();
                  onInvite?.();
                }}
                icon={<Icon name="userPlus" className="h-4 w-4 text-muted" />}
              >
                Invite someone
              </MenuItem>
              <MenuItem
                as={Link}
                href="/settings?tab=workspace"
                onSelect={close}
                icon={<Icon name="spark" className="h-4 w-4 text-muted" />}
              >
                Workspace settings
              </MenuItem>
            </>
          ) : null}
          {canInstall ? (
            <MenuItem
              onSelect={() => {
                close();
                promptInstall();
              }}
              icon={<Icon name="download" className="h-4 w-4 text-muted" />}
            >
              Install app
            </MenuItem>
          ) : null}
          <MenuDivider />
          <MenuItem
            danger
            onSelect={() => {
              close();
              onLogout?.();
            }}
            icon={<Icon name="logOut" className="h-4 w-4" />}
          >
            Log out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
