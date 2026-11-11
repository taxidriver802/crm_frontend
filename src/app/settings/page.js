"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useToast } from "@/components/toast/toast-provider";
import { useThemeController } from "@/components/theme/theme-controller";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { CompanyBrandingModal } from "@/components/modals/company-branding-modal";
import { CompanyMark, companyMarkProps } from "@/components/brand/company-mark";
import { getPalette } from "@/theme/registry";
import { CustomizeHome } from "@/components/today/customize-home";
import { useUrlTab } from "@/components/records/record-layout";
import { writeStoredCompanySlug } from "@/lib/company-slug";
import { NAV_ITEMS, resolveNav } from "@/lib/preferences";
import { cx } from "@/lib/cx";

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: "sliders" },
  { id: "navigation", label: "Navigation", icon: "columns" },
  { id: "home", label: "Today", icon: "home" },
  { id: "layouts", label: "Lists & records", icon: "layout" },
  { id: "account", label: "Sign-in & password", icon: "user" },
  { id: "workspace", label: "Workspace", icon: "users", admin: true },
];

const LIST_LABELS = { jobs: "Jobs list", leads: "Leads list", tasks: "Tasks list", invoices: "Invoices list" };
const RECORD_LABELS = { job: "Job record", lead: "Lead record" };

function Choice({ checked, onSelect, children, label }) {
  return (
    <button type="button" role="radio" aria-checked={checked} aria-label={label} className="choice-card" onClick={onSelect}>
      {children}
    </button>
  );
}

function SettingsPanel({ title, description, children, right }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{title}</h2>
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
        {right}
      </div>
      <div className="panel-body space-y-3">{children}</div>
    </section>
  );
}

function AppearanceSettings() {
  const { prefs, updatePrefs } = useWorkspace();
  const { palettes, usingCompanyDefault, paletteId, companyPaletteId } = useThemeController();
  const appearance = prefs.appearance || {};
  const theme = appearance.theme || "system";
  const density = appearance.density || "comfortable";
  const companyPalette = palettes.find((p) => p.id === companyPaletteId) || palettes[0];

  return (
    <div className="space-y-4" data-testid="settings-appearance">
      <SettingsPanel title="Theme" description="Auto follows your device.">
        <div className="choice-grid" role="radiogroup" aria-label="Theme">
          {[
            { id: "light", label: "Light", bg: "#f6f5f1", fg: "#1b1a17" },
            { id: "dark", label: "Dark", bg: "#191917", fg: "#f2f1ec" },
            { id: "system", label: "Auto", bg: "linear-gradient(135deg,#f6f5f1 50%,#191917 50%)", fg: "#8f8c84" },
          ].map((option) => (
            <Choice
              key={option.id}
              checked={theme === option.id}
              onSelect={() => updatePrefs({ appearance: { theme: option.id } })}
            >
              <span className="block h-10 rounded-md border border-[var(--border)]" style={{ background: option.bg }} />
              <span className="font-medium">{option.label}</span>
            </Choice>
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Accent palette"
        description="Your own look. Customers always see the company palette on portals and public pages."
      >
        <div className="choice-grid" role="radiogroup" aria-label="Accent palette">
          <Choice
            checked={usingCompanyDefault}
            onSelect={() => updatePrefs({ appearance: { palette: null } })}
            label="Company default"
          >
            <span className="swatch-row" aria-hidden>
              <span className="swatch" style={{ background: companyPalette?.preview.bg }} />
              <span className="swatch" style={{ background: companyPalette?.preview.surface }} />
              <span className="swatch" style={{ background: companyPalette?.preview.accent }} />
            </span>
            <span className="font-medium">Company default</span>
            <span className="text-xs text-muted">{companyPalette?.label}</span>
          </Choice>
          {palettes.map((palette) => (
            <Choice
              key={palette.id}
              checked={!usingCompanyDefault && paletteId === palette.id}
              onSelect={() => updatePrefs({ appearance: { palette: palette.id } })}
              label={palette.label}
            >
              <span className="swatch-row" aria-hidden>
                <span className="swatch" style={{ background: palette.preview.bg }} />
                <span className="swatch" style={{ background: palette.preview.surface }} />
                <span className="swatch" style={{ background: palette.preview.accent }} />
              </span>
              <span className="font-medium">{palette.label}</span>
            </Choice>
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel title="Density" description="Compact fits about a third more rows on screen.">
        <div className="choice-grid" role="radiogroup" aria-label="Density">
          {[
            { id: "comfortable", label: "Comfortable", rows: 4, h: 10 },
            { id: "compact", label: "Compact", rows: 6, h: 6 },
          ].map((option) => (
            <Choice
              key={option.id}
              checked={density === option.id}
              onSelect={() => updatePrefs({ appearance: { density: option.id } })}
            >
              <span className="density-preview" aria-hidden>
                {Array.from({ length: option.rows }).map((_, i) => (
                  <span key={i} style={{ height: option.h }} />
                ))}
              </span>
              <span className="font-medium">{option.label}</span>
            </Choice>
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel title="Motion">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(appearance.reduceMotion)}
            onChange={(e) => updatePrefs({ appearance: { reduceMotion: e.target.checked } })}
          />
          <span>
            <span className="font-medium">Reduce motion</span>
            <span className="block text-xs text-muted">Turns off panel slides and transitions.</span>
          </span>
        </label>
      </SettingsPanel>
    </div>
  );
}

function NavigationSettings() {
  const { prefs, role, updatePrefs } = useWorkspace();
  const items = resolveNav(prefs.nav, role);
  const pins = prefs.nav?.pins || [];

  function saveOrder(next) {
    // Keep ids the person cannot see (admin-only) in their saved order so a role change does not lose them.
    const visibleIds = next.map((item) => item.id);
    const rest = (prefs.nav?.order || NAV_ITEMS.map((i) => i.id)).filter((id) => !visibleIds.includes(id));
    updatePrefs({ nav: { order: [...visibleIds, ...rest] } });
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  }

  function setHidden(id, hidden) {
    const current = new Set(prefs.nav?.hidden || []);
    if (hidden) current.add(id);
    else current.delete(id);
    updatePrefs({ nav: { hidden: [...current] } });
  }

  return (
    <div className="space-y-4" data-testid="settings-navigation">
      <SettingsPanel
        title="Sidebar"
        description="Order and show the places you use. Today always stays. Phones show the first four as tabs."
        right={
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => updatePrefs({ nav: { order: NAV_ITEMS.map((i) => i.id), hidden: [] } })}
          >
            Reset order
          </button>
        }
      >
        <ul className="customize-list" aria-label="Sidebar items">
          {items.map((item, index) => (
            <li key={item.id} className="customize-row">
              <Icon name={item.icon} className="h-4 w-4 text-muted" />
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!item.hidden}
                  disabled={item.id === "today"}
                  onChange={(e) => setHidden(item.id, !e.target.checked)}
                  aria-label={`Show ${item.label}`}
                />
                <span className="truncate font-medium">{item.label}</span>
                <span className="text-xs text-muted">{item.group === "work" ? "Work" : "Tools"}</span>
              </label>
              {item.shortcut ? <span className="kbd hidden sm:inline-flex">{item.shortcut}</span> : null}
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-7 w-7"
                aria-label={`Move ${item.label} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon name="chevronUp" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-7 w-7"
                aria-label={`Move ${item.label} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon name="chevronDown" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(prefs.nav?.collapsed)}
            onChange={(e) => updatePrefs({ nav: { collapsed: e.target.checked } })}
          />
          Start with the sidebar collapsed to icons
          <span className="kbd">[</span>
        </label>
      </SettingsPanel>

      <SettingsPanel title="Pinned" description="Pin a job, lead or saved view from its page or preview.">
        {pins.length ? (
          <ul className="customize-list" aria-label="Pinned items">
            {pins.map((pin, index) => (
              <li key={pin.id} className="customize-row">
                <Icon name="pin" className="h-4 w-4 text-muted" />
                <Link href={pin.href} className="link min-w-0 flex-1 truncate text-sm">
                  {pin.label}
                </Link>
                <span className="text-xs capitalize text-muted">{pin.kind}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn-quiet h-7 w-7"
                  aria-label={`Move ${pin.label} up`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...pins];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    updatePrefs({ nav: { pins: next } });
                  }}
                >
                  <Icon name="chevronUp" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => updatePrefs({ nav: { pins: pins.filter((p) => p.id !== pin.id) } })}
                >
                  Unpin
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing pinned yet.</p>
        )}
      </SettingsPanel>
    </div>
  );
}

function LayoutSettings() {
  const { prefs, updatePrefs } = useWorkspace();
  const lists = Object.entries(prefs.lists || {});
  const records = Object.entries(prefs.records || {});

  return (
    <div className="space-y-4" data-testid="settings-layouts">
      <SettingsPanel
        title="Saved list layouts"
        description="Columns, order and sort you set from a list's Display menu."
      >
        {lists.length ? (
          <ul className="customize-list">
            {lists.map(([key, value]) => (
              <li key={key} className="customize-row">
                <Icon name="columns" className="h-4 w-4 text-muted" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{LIST_LABELS[key] || key}</span>
                  <span className="block text-xs text-muted">
                    {Array.isArray(value?.columns) ? `${value.columns.length} columns` : "Default columns"}
                    {value?.sort ? ` · sorted by ${value.sort.key} ${value.sort.dir === "desc" ? "↓" : "↑"}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => updatePrefs({ lists: { [key]: null } })}
                >
                  Reset
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Every list uses its standard layout.</p>
        )}
      </SettingsPanel>
      <SettingsPanel title="Record pages" description="Overview sections and the details rail you arranged on records.">
        {records.length ? (
          <ul className="customize-list">
            {records.map(([key, value]) => (
              <li key={key} className="customize-row">
                <Icon name="layout" className="h-4 w-4 text-muted" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{RECORD_LABELS[key] || key}</span>
                  <span className="block text-xs text-muted">
                    {(value?.sections || []).filter((s) => s.hidden).length} hidden sections
                    {value?.rail === false ? " · details rail hidden" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => updatePrefs({ records: { [key]: null } })}
                >
                  Reset
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Record pages use their standard layout.</p>
        )}
      </SettingsPanel>
    </div>
  );
}

function WorkspaceSettings({ askConfirm }) {
  const { company, setCompany, prefs, mine, defaults, saveAsDefaults } = useWorkspace();
  const { setCompanyPaletteId } = useThemeController();
  const { showToast } = useToast();
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [shareSections, setShareSections] = useState({ appearance: false, nav: true, home: true, lists: true });
  const [busy, setBusy] = useState(false);
  const definedDefaults = Object.keys(defaults || {}).filter((k) => defaults[k] && Object.keys(defaults[k]).length);

  async function share() {
    const patch = {};
    for (const [section, on] of Object.entries(shareSections)) {
      if (!on) continue;
      if (section === "appearance") {
        // Personal palette is personal; the team default is theme and density only.
        const { theme, density, reduceMotion } = prefs.appearance || {};
        patch.appearance = { theme, density, reduceMotion };
      } else if (section === "nav") {
        // Pins are personal records; never hand them to everyone.
        patch.nav = { order: prefs.nav?.order, hidden: prefs.nav?.hidden || [], collapsed: Boolean(prefs.nav?.collapsed) };
      } else if (section === "lists") {
        if (mine.lists && Object.keys(mine.lists).length) patch.lists = mine.lists;
      } else {
        patch[section] = prefs[section];
      }
    }
    if (!Object.keys(patch).length) {
      showToast("Choose at least one part of your workspace to share.");
      return;
    }
    setBusy(true);
    try {
      await saveAsDefaults(patch);
      showToast("Team defaults saved. People who have not changed those settings see them now.", { tone: "success" });
    } catch (e) {
      showToast(e?.message || "Could not save team defaults", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  function clearDefaults() {
    askConfirm({
      title: "Clear team defaults?",
      description: "Everyone without their own settings goes back to the standard workspace. Personal settings are kept.",
      confirmLabel: "Clear defaults",
      onConfirm: async () => {
        try {
          await saveAsDefaults({ appearance: null, nav: null, home: null, lists: null, records: null });
          showToast("Team defaults cleared.");
        } catch (e) {
          showToast(e?.message || "Could not clear team defaults", { tone: "danger" });
        }
      },
    });
  }

  return (
    <div className="space-y-4" data-testid="settings-workspace">
      <SettingsPanel
        title="Company look"
        description="Name, mark and palette. Customers see these on the portal, estimates and invoices."
        right={
          <button type="button" className="btn btn-sm" onClick={() => setBrandingOpen(true)}>
            Edit company look
          </button>
        }
      >
        <div className="flex items-center gap-3">
          <CompanyMark {...companyMarkProps(company)} className="h-10 w-10" />
          <div>
            <div className="font-medium">{company?.name || "Your company"}</div>
            <div className="text-xs text-muted">Palette: {getPalette(company?.palette_id).label}</div>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Team defaults"
        description="Hand your current setup to everyone who has not made their own. People can still change theirs."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Parts to share</legend>
          {[
            { id: "nav", label: "Sidebar order and hidden items" },
            { id: "home", label: "Today layout" },
            { id: "lists", label: "List columns and sort" },
            { id: "appearance", label: "Theme and density" },
          ].map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shareSections[option.id]}
                onChange={(e) => setShareSections((s) => ({ ...s, [option.id]: e.target.checked }))}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={share}>
            {busy ? "Saving…" : "Make my setup the team default"}
          </button>
          {definedDefaults.length ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearDefaults}>
              Clear team defaults
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted" data-testid="team-defaults-summary">
          {definedDefaults.length
            ? `Team defaults set for: ${definedDefaults.join(", ")}.`
            : "No team defaults yet. Everyone starts from the standard workspace."}
        </p>
      </SettingsPanel>

      <SettingsPanel title="Team and access" description="Invite people and set roles.">
        <div className="flex flex-wrap gap-2">
          <Link href="/users" className="btn btn-sm">
            Manage team
          </Link>
          <Link href="/automation" className="btn btn-sm">
            Automation
          </Link>
          <Link href="/estimates/templates" className="btn btn-sm">
            Estimate templates
          </Link>
          <Link href="/integrations" className="btn btn-sm">
            Integrations
          </Link>
        </div>
      </SettingsPanel>

      <CompanyBrandingModal
        open={brandingOpen}
        company={company}
        onClose={() => setBrandingOpen(false)}
        onSaved={(next) => {
          setCompany(next);
          if (next?.palette_id) setCompanyPaletteId(next.palette_id);
          if (next?.slug) writeStoredCompanySlug(next.slug);
        }}
      />
    </div>
  );
}

/** Change password, and end the sessions on other devices. */
function AccountSettings({ askConfirm }) {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e) {
    e.preventDefault();
    setError("");
    if (next.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords don’t match.");
      return;
    }
    setBusy(true);
    try {
      const data = await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      const others = data.other_sessions_ended || 0;
      showToast(
        others
          ? `Password changed. ${others === 1 ? "1 other device was" : `${others} other devices were`} signed out.`
          : "Password changed.",
        { tone: "success" }
      );
    } catch (err) {
      setError(typeof err?.message === "string" ? err.message : "Couldn’t change the password.");
    } finally {
      setBusy(false);
    }
  }

  function endOthers() {
    askConfirm({
      title: "Sign out everywhere else?",
      description: "Every other browser and device signed in as you is signed out. This one stays signed in.",
      confirmLabel: "Sign out others",
      onConfirm: async () => {
        try {
          const data = await api("/auth/sessions/end-others", { method: "POST" });
          const n = data.ended || 0;
          showToast(
            n ? `Signed out ${n === 1 ? "1 other session" : `${n} other sessions`}.` : "No other sessions were signed in.",
            { tone: "success" }
          );
        } catch (err) {
          showToast(err?.message || "Couldn’t sign out the other sessions", { tone: "danger" });
        }
      },
    });
  }

  return (
    <div className="space-y-4" data-testid="settings-account">
      <SettingsPanel
        title="Change password"
        description="You stay signed in here. Every other device signs out."
      >
        <form onSubmit={changePassword} className="max-w-sm space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Current password</span>
            <input
              type="password"
              className="input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">New password</span>
            <input
              type="password"
              className="input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Confirm new password</span>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      </SettingsPanel>
      <SettingsPanel
        title="Other devices"
        description="Signed in on a shared tablet or a phone you no longer have? End those sessions from here."
      >
        <button type="button" className="btn btn-sm" onClick={endOthers}>
          <Icon name="logOut" className="h-3.5 w-3.5" />
          Sign out everywhere else
        </button>
      </SettingsPanel>
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin, loaded, resetPrefs, saving } = useWorkspace();
  const { askConfirm, confirmModal } = useConfirmModal();
  const sections = SECTIONS.filter((s) => !s.admin || isAdmin);
  const [tab, setTab] = useUrlTab(
    "appearance",
    SECTIONS.map((s) => s.id),
  );
  const active = sections.some((s) => s.id === tab) ? tab : "appearance";

  function resetAll() {
    askConfirm({
      title: "Reset your workspace?",
      description: "Your theme, sidebar, pins, Today layout and list layouts go back to the team defaults.",
      confirmLabel: "Reset",
      onConfirm: resetPrefs,
    });
  }

  return (
    <AppShell
      title="Preferences"
      description={saving ? "Saving…" : "Saved to your account and synced across devices."}
      right={
        <button type="button" className="btn btn-sm btn-ghost" onClick={resetAll}>
          <Icon name="undo" className="h-3.5 w-3.5" />
          Reset all
        </button>
      }
    >
      <div className="settings-grid">
        <nav className="settings-nav" role="tablist" aria-label="Preference sections" aria-orientation="vertical">
          {sections.map((section) => (
            <button
              key={section.id}
              id={`tab-${section.id}`}
              type="button"
              role="tab"
              aria-selected={active === section.id}
              aria-controls={`panel-${section.id}`}
              className={cx("rail-link", active === section.id && "rail-link-active")}
              onClick={() => setTab(section.id)}
            >
              <Icon name={section.icon} className="h-4 w-4" />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="min-w-0">
          {!loaded ? (
            <div className="panel space-y-2 p-4">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-16 w-full" />
            </div>
          ) : active === "appearance" ? (
            <AppearanceSettings />
          ) : active === "navigation" ? (
            <NavigationSettings />
          ) : active === "home" ? (
            <CustomizeHome />
          ) : active === "layouts" ? (
            <LayoutSettings />
          ) : active === "account" ? (
            <AccountSettings askConfirm={askConfirm} />
          ) : active === "workspace" ? (
            <WorkspaceSettings askConfirm={askConfirm} />
          ) : null}
        </div>
      </div>
      {confirmModal}
    </AppShell>
  );
}
