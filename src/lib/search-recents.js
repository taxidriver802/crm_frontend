/** Persist recent command-palette / shell navigations (localStorage). */

export const SEARCH_RECENTS_STORAGE_KEY = "crm-search-recents";
export const SEARCH_RECENTS_LIMIT = 5;

/**
 * Detail routes that should feed the recents store when visited via normal navigation.
 * Pages (list routes) are recorded from the palette Pages mode instead.
 */
const ENTITY_DETAIL_PATTERNS = [
  {
    re: /^\/leads\/(\d+)\/?$/,
    build: (id) => ({
      href: `/leads/${id}`,
      label: `Lead #${id}`,
      sublabel: "Lead",
      icon: "users",
      group: "Leads",
    }),
  },
  {
    re: /^\/jobs\/(\d+)\/?$/,
    build: (id) => ({
      href: `/jobs/${id}`,
      label: `Job #${id}`,
      sublabel: "Job",
      icon: "briefcase",
      group: "Jobs",
    }),
  },
  {
    re: /^\/tasks\/(\d+)\/?$/,
    build: (id) => ({
      href: `/tasks/${id}`,
      label: `Task #${id}`,
      sublabel: "Task",
      icon: "checklist",
      group: "Tasks",
    }),
  },
  {
    re: /^\/invoices\/(\d+)\/?$/,
    build: (id) => ({
      href: `/invoices/${id}`,
      label: `Invoice #${id}`,
      sublabel: "Invoice",
      icon: "invoice",
      group: "Invoices",
    }),
  },
  {
    re: /^\/estimates\/(\d+)\/?$/,
    build: (id) => ({
      href: `/estimates/${id}`,
      label: `Estimate #${id}`,
      sublabel: "Estimate",
      icon: "invoice",
      group: "Estimates",
    }),
  },
];

function isValidRecent(entry) {
  return (
    entry &&
    typeof entry.href === "string" &&
    entry.href.startsWith("/") &&
    !entry.href.includes("#") &&
    typeof entry.label === "string" &&
    entry.label.trim() !== "" &&
    entry.group !== "Jump"
  );
}

function normalizeRecent(entry) {
  return {
    href: entry.href,
    label: entry.label,
    sublabel: typeof entry.sublabel === "string" ? entry.sublabel : "",
    icon: typeof entry.icon === "string" ? entry.icon : "search",
    group: typeof entry.group === "string" ? entry.group : "Recent",
  };
}

export function readSearchRecents() {
  try {
    const raw = localStorage.getItem(SEARCH_RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecent).map(normalizeRecent).slice(0, SEARCH_RECENTS_LIMIT);
  } catch {
    return [];
  }
}

export function writeSearchRecents(entries) {
  try {
    const next = (Array.isArray(entries) ? entries : [])
      .filter(isValidRecent)
      .map(normalizeRecent)
      .slice(0, SEARCH_RECENTS_LIMIT);
    localStorage.setItem(SEARCH_RECENTS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

/** Prepend a recent entry (dedupe by href, cap length). Returns the new list. */
export function pushSearchRecent(entry) {
  if (!isValidRecent(entry)) return readSearchRecents();
  const normalized = normalizeRecent(entry);
  const prev = readSearchRecents().filter((item) => item.href !== normalized.href);
  return writeSearchRecents([normalized, ...prev]);
}

/** If pathname is an entity detail route, record a placeholder recent. */
export function recordRecentFromPathname(pathname) {
  if (!pathname || typeof pathname !== "string") return null;

  for (const pattern of ENTITY_DETAIL_PATTERNS) {
    const match = pathname.match(pattern.re);
    if (!match) continue;
    const entry = pattern.build(match[1]);
    const existing = readSearchRecents().find((item) => item.href === entry.href);
    // Re-bump an existing richer palette entry instead of overwriting with #id.
    pushSearchRecent(existing || entry);
    return entry.href;
  }

  return null;
}

/**
 * Parse the current detail route into palette context.
 * @returns {{ type: string, id: number, label: string, href: string } | null}
 */
export function parseEntityContext(pathname) {
  if (!pathname || typeof pathname !== "string") return null;

  const patterns = [
    { re: /^\/leads\/(\d+)\/?$/, type: "lead", label: "lead", icon: "users" },
    { re: /^\/jobs\/(\d+)\/?$/, type: "job", label: "job", icon: "briefcase" },
    { re: /^\/tasks\/(\d+)\/?$/, type: "task", label: "task", icon: "checklist" },
    { re: /^\/invoices\/(\d+)\/?$/, type: "invoice", label: "invoice", icon: "invoice" },
    { re: /^\/estimates\/(\d+)\/?$/, type: "estimate", label: "estimate", icon: "invoice" },
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern.re);
    if (!match) continue;
    const id = Number(match[1]);
    if (!Number.isFinite(id)) return null;
    return {
      type: pattern.type,
      id,
      label: pattern.label,
      icon: pattern.icon,
      href: `/${pattern.type === "lead" ? "leads" : pattern.type === "job" ? "jobs" : pattern.type === "task" ? "tasks" : pattern.type === "invoice" ? "invoices" : "estimates"}/${id}`,
    };
  }

  return null;
}

/** Section deep-links available for the current entity context (Jump group). */
export function getContextSectionLinks(context) {
  if (!context?.type || !context?.id) return [];
  const { type, id } = context;

  if (type === "job") {
    return [
      {
        key: `ctx-job-${id}-files`,
        href: `/jobs/${id}#section-files`,
        label: "Attached files",
        sublabel: "On this job",
        group: "Jump",
        icon: "folder",
      },
      {
        key: `ctx-job-${id}-activity`,
        href: `/jobs/${id}#section-activity`,
        label: "Activity",
        sublabel: "On this job",
        group: "Jump",
        icon: "chart",
      },
    ];
  }

  if (type === "lead") {
    return [
      {
        key: `ctx-lead-${id}-files`,
        href: `/leads/${id}#section-files`,
        label: "Attached files",
        sublabel: "On this lead",
        group: "Jump",
        icon: "folder",
      },
    ];
  }

  if (type === "invoice") {
    return [
      {
        key: `ctx-invoice-${id}-timeline`,
        href: `/invoices/${id}#section-timeline`,
        label: "Timeline",
        sublabel: "On this invoice",
        group: "Jump",
        icon: "invoice",
      },
    ];
  }

  return [];
}
