/**
 * Workspace preferences: the one frontend definition of what a person can
 * shape (navigation, home, lists, records, appearance) and the defaults they
 * start from. The backend (crm_backend/src/validators/preferences.schemas.ts)
 * validates the same ids; keep the two lists in step.
 */

export const ROLE_ADMIN = new Set(["owner", "admin"]);

/**
 * Every destination the rail can show. `group` decides where it sits by
 * default; people can reorder and hide within the rail, but admin-only items
 * never appear for agents regardless of preference.
 */
export const NAV_ITEMS = [
  { id: "today", label: "Today", href: "/dashboard", icon: "home", group: "work", shortcut: "g h" },
  { id: "jobs", label: "Jobs", href: "/jobs", icon: "briefcase", group: "work", shortcut: "g j" },
  { id: "leads", label: "Leads", href: "/leads", icon: "users", group: "work", shortcut: "g l" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: "checklist", group: "work", shortcut: "g t" },
  { id: "money", label: "Invoices", href: "/invoices", icon: "invoice", group: "work", shortcut: "g i" },
  { id: "inbox", label: "Inbox", href: "/notifications", icon: "inbox", group: "work", shortcut: "g n" },
  { id: "files", label: "Files", href: "/files", icon: "folder", group: "tools" },
  { id: "reports", label: "Reports", href: "/reports", icon: "chart", group: "tools", shortcut: "g r" },
  { id: "templates", label: "Templates", href: "/estimates/templates", icon: "invoice", group: "tools", admin: true },
  { id: "automation", label: "Automation", href: "/automation", icon: "spark", group: "tools", admin: true },
  { id: "integrations", label: "Integrations", href: "/integrations", icon: "plug", group: "tools", admin: true },
  { id: "team", label: "Team", href: "/users", icon: "users", group: "tools", admin: true },
];

export const DEFAULT_NAV_ORDER = NAV_ITEMS.map((item) => item.id);

export const HOME_WIDGETS = [
  {
    id: "needs-you",
    label: "Needs you",
    description: "Overdue follow-ups, money to chase, work stuck between hands.",
    defaultColumn: "main",
  },
  {
    id: "agenda",
    label: "Agenda",
    description: "Today's appointments and what is due, in time order.",
    defaultColumn: "main",
  },
  {
    id: "handoffs",
    label: "Handoffs",
    description: "Sold but not scheduled, and finished but not billed.",
    defaultColumn: "main",
  },
  {
    id: "money",
    label: "Money",
    description: "Owed, past due, unbilled approved work, collected this month.",
    defaultColumn: "side",
    admin: true,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    description: "Jobs by phase, from selling to closed.",
    defaultColumn: "side",
  },
  {
    id: "pinned",
    label: "Pinned",
    description: "Records and views you keep close.",
    defaultColumn: "side",
  },
  {
    id: "team",
    label: "Team load",
    description: "Open work and overdue tasks per person.",
    defaultColumn: "side",
    admin: true,
  },
  {
    id: "activity",
    label: "Recent activity",
    description: "What changed across your jobs.",
    defaultColumn: "side",
  },
];

export const DEFAULT_PREFERENCES = {
  appearance: { theme: "system", density: "comfortable", palette: null, reduceMotion: false },
  nav: { order: DEFAULT_NAV_ORDER, hidden: [], collapsed: false, pins: [] },
  home: {
    widgets: HOME_WIDGETS.map((w) => ({ id: w.id, column: w.defaultColumn, hidden: w.id === "activity" })),
  },
  lists: {},
  records: {},
};

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

/** Defaults overlaid with effective server preferences, one level deep. */
export function withDefaults(effective) {
  const out = {};
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    const base = DEFAULT_PREFERENCES[key];
    const value = effective?.[key];
    out[key] = isObject(base) && isObject(value) ? { ...base, ...value } : (value ?? base);
  }
  return out;
}

/** Applies a PATCH locally with the same rules the server uses. */
export function applyPatch(current, patch) {
  const next = { ...(current || {}) };
  for (const [section, value] of Object.entries(patch || {})) {
    if (value === null) {
      delete next[section];
      continue;
    }
    if (!isObject(value)) continue;
    const base = isObject(next[section]) ? { ...next[section] } : {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null && (section === "lists" || section === "records")) delete base[key];
      else if (entry !== undefined) base[key] = entry;
    }
    next[section] = base;
  }
  return next;
}

export function isAdminRole(role) {
  return ROLE_ADMIN.has(role);
}

/**
 * The rail a given person sees: their order (new items appended), minus what
 * they hid, minus what their role cannot reach.
 */
export function resolveNav(nav, role) {
  const order = Array.isArray(nav?.order) && nav.order.length ? nav.order : DEFAULT_NAV_ORDER;
  const known = new Map(NAV_ITEMS.map((item) => [item.id, item]));
  const ids = [...order.filter((id) => known.has(id)), ...DEFAULT_NAV_ORDER.filter((id) => !order.includes(id))];
  const hidden = new Set(nav?.hidden || []);
  const admin = isAdminRole(role);
  return ids
    .map((id) => known.get(id))
    .filter((item) => item && (!item.admin || admin))
    .map((item) => ({ ...item, hidden: hidden.has(item.id) && item.id !== "today" }));
}

export function resolveWidgets(home, role) {
  const admin = isAdminRole(role);
  const known = new Map(HOME_WIDGETS.map((w) => [w.id, w]));
  const saved = Array.isArray(home?.widgets) ? home.widgets.filter((w) => known.has(w.id)) : [];
  const missing = HOME_WIDGETS.filter((w) => !saved.some((s) => s.id === w.id)).map((w) => ({
    id: w.id,
    column: w.defaultColumn,
    hidden: true,
  }));
  return [...saved, ...missing]
    .map((w) => ({ ...known.get(w.id), ...w }))
    .filter((w) => !w.admin || admin);
}

export function pinKey(kind, id) {
  return `${kind}:${id}`;
}
