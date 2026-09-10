"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Overlay } from "@/components/ui/overlay";
import { Icon } from "@/components/icons";
import { clearReturnStack } from "@/lib/return-to";
import {
  getContextSectionLinks,
  pushSearchRecent,
  readSearchRecents,
} from "@/lib/search-recents";
import {
  applySearchFilterToken,
  buildSearchRequestQuery,
  hasActiveSearchFilters,
  parseSearchQuery,
  removeSearchFilterToken,
  SEARCH_FILTER_EXAMPLES,
  SEARCH_FILTER_MENU,
  SEARCH_JUMP_FILTER,
} from "@/lib/search-filters";
import { cx } from "@/lib/cx";

const QUICK_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "home", keywords: "home overview dash" },
  { href: "/leads", label: "Leads", icon: "users", keywords: "contacts ld" },
  { href: "/jobs", label: "Jobs", icon: "briefcase", keywords: "projects jb" },
  { href: "/tasks", label: "Tasks", icon: "checklist", keywords: "to do todo tk" },
  { href: "/invoices", label: "Invoices", icon: "invoice", keywords: "billing inv" },
  { href: "/files", label: "Files", icon: "folder", keywords: "documents docs fl" },
  { href: "/reports", label: "Reports", icon: "chart", keywords: "analytics rpt" },
  { href: "/automation", label: "Automation", icon: "spark", keywords: "workflows auto" },
  { href: "/estimates/templates", label: "Templates", icon: "invoice", keywords: "quotes estimate packages est tmpl" },
  { href: "/integrations", label: "Integrations", icon: "plug", keywords: "connections integ" },
  { href: "/users", label: "Users", icon: "users", keywords: "team usr" },
];

const EMPTY_RESULTS = {
  leads: [],
  jobs: [],
  tasks: [],
  invoices: [],
  estimates: [],
  files: [],
  users: [],
  related: {
    leads: [],
    jobs: [],
    tasks: [],
    invoices: [],
    estimates: [],
    files: [],
    users: [],
  },
};

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function fileHref(file) {
  if (file?.job_id) return `/jobs/${file.job_id}`;
  if (file?.lead_id) return `/leads/${file.lead_id}`;
  return "/files";
}

function fileSublabel(file) {
  const parts = [];
  if (file?.mime_type) parts.push(file.mime_type);
  if (file?.job_id) parts.push(`Job #${file.job_id}`);
  else if (file?.lead_id) parts.push(`Lead #${file.lead_id}`);
  return parts.join(" · ") || "File";
}

function parseActionsQuery(query) {
  const trimmed = query.trimStart();
  if (!trimmed.startsWith(">")) {
    return { isActionsMode: false, filter: "" };
  }
  return {
    isActionsMode: true,
    filter: trimmed.slice(1).trim().toLowerCase(),
  };
}

function buildActionItems({ filter, isAdminUser, onInviteUser, onMarkAllNotificationsRead }) {
  const actions = [
    {
      key: "action-create-lead",
      href: "/leads/new",
      label: "Create lead",
      sublabel: "Open the new lead form",
      group: "Actions",
      icon: "users",
      keywords: "new lead contact",
    },
    {
      key: "action-new-task",
      href: "/tasks/new",
      label: "New task",
      sublabel: "Open the new task form",
      group: "Actions",
      icon: "checklist",
      keywords: "create todo",
    },
    {
      key: "action-mark-all-read",
      label: "Mark all notifications read",
      sublabel: "Clear the unread badge",
      group: "Actions",
      icon: "bell",
      keywords: "notifications unread clear",
      onSelect: onMarkAllNotificationsRead,
    },
  ];

  if (isAdminUser) {
    actions.push({
      key: "action-invite-user",
      label: "Invite user",
      sublabel: "Send a team invite",
      group: "Actions",
      icon: "userPlus",
      keywords: "team admin invite",
      onSelect: onInviteUser,
    });
  }

  if (!filter) return actions;

  return actions.filter((action) => {
    const haystack = `${action.label} ${action.sublabel} ${action.keywords || ""}`.toLowerCase();
    return haystack.includes(filter);
  });
}

function hasGlobalEntityHits(results) {
  return (
    (results.leads || []).length > 0 ||
    (results.jobs || []).length > 0 ||
    (results.tasks || []).length > 0 ||
    (results.invoices || []).length > 0 ||
    (results.estimates || []).length > 0 ||
    (results.files || []).length > 0 ||
    (results.users || []).length > 0
  );
}

function hasSearchHits(results) {
  return hasGlobalEntityHits(results) || hasRelatedHits(results.related);
}

function hasRelatedHits(related) {
  if (!related) return false;
  return (
    (related.leads || []).length > 0 ||
    (related.jobs || []).length > 0 ||
    (related.tasks || []).length > 0 ||
    (related.invoices || []).length > 0 ||
    (related.estimates || []).length > 0 ||
    (related.files || []).length > 0
  );
}

function pushEntityResults(output, results, { group, keyPrefix = "" } = {}) {
  for (const lead of results.leads || []) {
    output.push({
      key: `${keyPrefix}lead-${lead.id}`,
      href: `/leads/${lead.id}`,
      label: `${lead.first_name} ${lead.last_name}`.trim() || `Lead #${lead.id}`,
      sublabel: lead.email || lead.status || "Lead",
      group: group || "Leads",
      icon: "users",
    });
  }
  for (const job of results.jobs || []) {
    output.push({
      key: `${keyPrefix}job-${job.id}`,
      href: `/jobs/${job.id}`,
      label: job.title || `Job #${job.id}`,
      sublabel: job.address || job.status || "Job",
      group: group || "Jobs",
      icon: "briefcase",
    });
  }
  for (const task of results.tasks || []) {
    output.push({
      key: `${keyPrefix}task-${task.id}`,
      href: `/tasks/${task.id}`,
      label: task.title || `Task #${task.id}`,
      sublabel: task.status || "Task",
      group: group || "Tasks",
      icon: "checklist",
    });
  }
  for (const invoice of results.invoices || []) {
    const amount = formatMoney(invoice.grand_total);
    output.push({
      key: `${keyPrefix}invoice-${invoice.id}`,
      href: `/invoices/${invoice.id}`,
      label: invoice.invoice_number || `Invoice #${invoice.id}`,
      sublabel: [invoice.status, amount].filter(Boolean).join(" · ") || "Invoice",
      group: group || "Invoices",
      icon: "invoice",
    });
  }
  for (const estimate of results.estimates || []) {
    const amount = formatMoney(estimate.grand_total);
    output.push({
      key: `${keyPrefix}estimate-${estimate.id}`,
      href: `/estimates/${estimate.id}`,
      label: estimate.title || `Estimate #${estimate.id}`,
      sublabel: [estimate.status, amount].filter(Boolean).join(" · ") || "Estimate",
      group: group || "Estimates",
      icon: "invoice",
    });
  }
  for (const file of results.files || []) {
    output.push({
      key: `${keyPrefix}file-${file.id}`,
      href: fileHref(file),
      label: file.original_name || `File #${file.id}`,
      sublabel: fileSublabel(file),
      group: group || "Files",
      icon: "folder",
    });
  }
  for (const user of results.users || []) {
    output.push({
      key: `${keyPrefix}user-${user.id}`,
      href: "/users",
      label: `${user.first_name} ${user.last_name}`.trim() || user.email || "User",
      sublabel: [user.role, user.email].filter(Boolean).join(" · ") || "Team",
      group: group || "Users",
      icon: "users",
    });
  }
}

function buildCreateFromQueryItems(queryText) {
  const trimmed = queryText.trim();
  if (!trimmed) return [];

  const encoded = encodeURIComponent(trimmed);
  return [
    {
      key: `create-lead-${trimmed}`,
      href: `/leads/new?name=${encoded}`,
      label: `Create lead named “${trimmed}”`,
      sublabel: "Open the new lead form with this name",
      group: "Create",
      icon: "users",
    },
    {
      key: `create-task-${trimmed}`,
      href: `/tasks/new?title=${encoded}`,
      label: `Create task “${trimmed}”`,
      sublabel: "Open the new task form with this title",
      group: "Create",
      icon: "checklist",
    },
  ];
}

function flattenResults(
  results,
  query,
  navigationMode,
  recents = [],
  {
    isAdminUser,
    onInviteUser,
    onMarkAllNotificationsRead,
    includeCreateFromQuery = false,
    createFromQueryText = "",
    entityContext = null,
    jumpActive = false,
    browseEmpty = false,
  } = {},
) {
  const { isActionsMode, filter: actionFilter } = parseActionsQuery(query);
  if (isActionsMode) {
    return buildActionItems({
      filter: actionFilter,
      isAdminUser,
      onInviteUser,
      onMarkAllNotificationsRead,
    });
  }

  const output = [];
  const contextGroup = entityContext ? `On this ${entityContext.label}` : null;
  const related = results.related || EMPTY_RESULTS.related;
  const sectionLinks = jumpActive ? getContextSectionLinks(entityContext) : [];

  if (navigationMode === "results") {
    if (sectionLinks.length) {
      output.push(...sectionLinks);
    }

    if (browseEmpty) {
      if (contextGroup && hasRelatedHits(related)) {
        pushEntityResults(output, related, {
          group: contextGroup,
          keyPrefix: "related-",
        });
      }
      for (const recent of recents) {
        if (entityContext?.href && recent.href === entityContext.href) continue;
        if (String(recent.href || "").includes("#")) continue;
        output.push({
          key: `recent-${recent.href}`,
          href: recent.href,
          label: recent.label,
          sublabel: recent.sublabel || recent.group || "Recent",
          group: "Recent",
          icon: recent.icon || "search",
        });
      }
      return output;
    }

    if (contextGroup && hasRelatedHits(related)) {
      pushEntityResults(output, related, {
        group: contextGroup,
        keyPrefix: "related-",
      });
    }

    const relatedHrefs = new Set(
      output.filter((item) => item.group === contextGroup).map((item) => item.href),
    );

    const globalItems = [];
    pushEntityResults(globalItems, results, { keyPrefix: "" });
    for (const item of globalItems) {
      if (relatedHrefs.has(item.href)) continue;
      output.push(item);
    }

    if (
      includeCreateFromQuery &&
      !hasGlobalEntityHits(results) &&
      !hasRelatedHits(related)
    ) {
      output.push(
        ...buildCreateFromQueryItems(createFromQueryText || query.trim()),
      );
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (navigationMode === "pages") {
    for (const page of QUICK_NAV_ITEMS) {
      const haystack = `${page.label} ${page.keywords}`.toLowerCase();
      if (!normalizedQuery || haystack.includes(normalizedQuery)) {
        output.push({
          key: `page-${page.href}`,
          href: page.href,
          label: page.label,
          sublabel: "Go to page",
          group: "Pages",
          icon: page.icon,
        });
      }
    }
  }

  return output;
}

function groupItems(items) {
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) {
      last.items.push(item);
    } else {
      groups.push({ name: item.group, items: [item] });
    }
  }
  return groups;
}

function rememberSelection(item) {
  if (!item?.href || typeof item.onSelect === "function") return;
  if (item.group === "Jump" || String(item.href).includes("#")) return;
  const existing = readSearchRecents().find((entry) => entry.href === item.href);
  pushSearchRecent({
    href: item.href,
    label: item.label,
    sublabel: item.sublabel,
    icon: item.icon,
    group:
      item.group &&
      item.group !== "Recent" &&
      item.group !== "Actions" &&
      item.group !== "Create" &&
      item.group !== "Jump" &&
      !String(item.group).startsWith("On this ")
        ? item.group
        : existing?.group || "Recent",
  });
}

function PaletteItem({ item, active, onActivate, onHover }) {
  const className = cx(
    "flex w-full items-start gap-2.5 px-3.5 py-2 text-left transition",
    active ? "bg-accent" : "hover:bg-accent",
  );

  const content = (
    <>
      <span className="bg-surface text-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-theme-md">
        <Icon name={item.icon || "search"} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{item.label}</p>
        <p className="text-muted mt-0.5 truncate text-xs leading-relaxed">
          {item.sublabel}
        </p>
      </div>
    </>
  );

  if (typeof item.onSelect === "function") {
    return (
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.preventDefault();
          onActivate();
        }}
        onMouseEnter={onHover}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      onClick={() => onActivate()}
      onMouseEnter={onHover}
    >
      {content}
    </Link>
  );
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  autoFocus = true,
  showInput = true,
  externalKeyDownRef = null,
  entityContext = null,
  isAdminUser = false,
  onInviteUser,
  onMarkAllNotificationsRead,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [recents, setRecents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigationMode, setNavigationMode] = useState("results");
  const [searchReady, setSearchReady] = useState(false);
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const handleKeyDownRef = useRef(null);
  const filtersMenuRef = useRef(null);

  const setQuery = onQueryChange;

  const { isActionsMode } = parseActionsQuery(query);
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);
  const hasSearchCriteria = !isActionsMode && hasActiveSearchFilters(parsedQuery);
  const hasContext = Boolean(entityContext?.type && entityContext?.id);
  const shouldSearch = hasSearchCriteria || hasContext;
  const searchRequestKey = [
    parsedQuery.text,
    parsedQuery.types.join(","),
    parsedQuery.status || "",
    parsedQuery.assigned || "",
    entityContext?.type || "",
    entityContext?.id || "",
  ].join("|");

  const inviteUserRef = useRef(onInviteUser);
  const markAllReadRef = useRef(onMarkAllNotificationsRead);
  inviteUserRef.current = onInviteUser;
  markAllReadRef.current = onMarkAllNotificationsRead;

  const flatItems = useMemo(
    () =>
      flattenResults(results, query, navigationMode, recents, {
        isAdminUser,
        onInviteUser: () => inviteUserRef.current?.(),
        onMarkAllNotificationsRead: () => markAllReadRef.current?.(),
        includeCreateFromQuery:
          searchReady && !loading && Boolean(parsedQuery.text),
        createFromQueryText: parsedQuery.text,
        entityContext,
        jumpActive: Boolean(parsedQuery.jump),
        browseEmpty:
          !parsedQuery.text &&
          !parsedQuery.types.length &&
          !parsedQuery.status &&
          !parsedQuery.assigned,
      }),
    [
      results,
      query,
      navigationMode,
      recents,
      isAdminUser,
      searchReady,
      loading,
      parsedQuery.text,
      parsedQuery.types,
      parsedQuery.status,
      parsedQuery.assigned,
      parsedQuery.jump,
      entityContext,
    ],
  );
  const groupedItems = useMemo(() => groupItems(flatItems), [flatItems]);

  useEffect(() => {
    if (!open) return;
    setRecents(readSearchRecents());
    setNavigationMode("results");
    setFiltersMenuOpen(false);
  }, [open]);

  useEffect(() => {
    if (!filtersMenuOpen) return undefined;
    function onPointerDown(event) {
      if (!filtersMenuRef.current?.contains(event.target)) {
        setFiltersMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [filtersMenuOpen]);

  useEffect(() => {
    if (!open || !autoFocus || !showInput) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      const value = inputRef.current?.value || "";
      if (!value) {
        inputRef.current?.select();
      } else {
        const len = value.length;
        inputRef.current?.setSelectionRange(len, len);
      }
    }, 20);
    return () => clearTimeout(t);
  }, [open, autoFocus, showInput]);

  useEffect(() => {
    if (!open) return;
    if (isActionsMode) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setSearchReady(false);
      return;
    }

    if (!shouldSearch) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setSearchReady(false);
      return;
    }

    setSearchReady(false);
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = buildSearchRequestQuery({
          ...parsedQuery,
          contextType: entityContext?.type || null,
          contextId: entityContext?.id || null,
        });
        const data = await api(`/search?${qs}`);
        setResults({
          leads: data.leads || [],
          jobs: data.jobs || [],
          tasks: data.tasks || [],
          invoices: data.invoices || [],
          estimates: data.estimates || [],
          files: data.files || [],
          users: data.users || [],
          related: data.related || EMPTY_RESULTS.related,
        });
      } catch (_e) {
        setResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
        setSearchReady(true);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, isActionsMode, shouldSearch, searchRequestKey, parsedQuery, entityContext]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open, navigationMode]);

  function selectItem(item, { viaLink = false } = {}) {
    if (!item) return;

    if (typeof item.onSelect === "function") {
      onClose();
      item.onSelect();
      return;
    }

    if (!item.href) return;
    rememberSelection(item);
    clearReturnStack();
    onClose();
    if (!viaLink) router.push(item.href);
  }

  function enterActionsMode() {
    setNavigationMode("results");
    setQuery(query.trimStart().startsWith(">") ? query : ">");
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (filtersMenuOpen) {
        setFiltersMenuOpen(false);
        return;
      }
      onClose();
      return;
    }

    if (e.key === "Control" && !isActionsMode) {
      if (e.repeat) return;
      e.preventDefault();
      setNavigationMode((currentMode) =>
        currentMode === "results" ? "pages" : "results",
      );
      setActiveIndex(0);
      return;
    }

    if (!flatItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectItem(flatItems[activeIndex]);
    }
  }

  function applyFilterExample(token) {
    setNavigationMode("results");
    setFiltersMenuOpen(false);
    if (isActionsMode) {
      setQuery(token.raw);
      return;
    }
    setQuery(applySearchFilterToken(query, token));
  }

  function renderFilterExamples() {
    const examples = [...SEARCH_FILTER_EXAMPLES];
    if (entityContext) {
      examples.push(SEARCH_JUMP_FILTER);
    }
    return (
      <div className="px-3.5 pb-3 pt-1">
        <p className="text-soft pb-1.5 text-[10px] font-semibold uppercase tracking-wider">
          Try a filter
        </p>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <button
              key={example.raw}
              type="button"
              className="border-base bg-surface text-muted hover:bg-accent hover:text-main inline-flex items-center gap-1.5 rounded-theme-sm border px-2 py-1 text-[11px] transition"
              onClick={() => applyFilterExample(example)}
            >
              <span>{example.label}</span>
              <span className="text-soft font-mono text-[10px]">{example.raw}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    if (!externalKeyDownRef) return undefined;
    if (!open) {
      externalKeyDownRef.current = null;
      return undefined;
    }
    externalKeyDownRef.current = (event) => handleKeyDownRef.current?.(event);
    return () => {
      externalKeyDownRef.current = null;
    };
  }, [open, externalKeyDownRef]);

  if (!open) return null;

  let runningIndex = -1;
  const isPagesMode = !isActionsMode && navigationMode === "pages";
  const hasQuery = Boolean(query.trim()) && !isActionsMode;
  const showingRecents = !hasQuery && !isPagesMode && !isActionsMode;

  return (
    <Overlay
      layer="palette"
      className="p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cx(
          "dropdown-panel mx-auto mt-[8vh] flex w-full max-w-xl flex-col overflow-hidden sm:mt-[10vh]",
          "border-strong shadow-[0_12px_40px_rgb(15_20_23/0.16)] dark:shadow-[0_16px_48px_rgb(0_0_0/0.55)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showInput ? (
          <div className="border-base flex items-center gap-2.5 border-b px-3.5 py-3">
            <Icon
              name={isActionsMode ? "spark" : "search"}
              className="text-muted h-4 w-4 shrink-0"
            />
            <input
              ref={inputRef}
              className="placeholder:text-soft min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              placeholder={
                isActionsMode
                  ? "Filter actions…"
                  : isPagesMode
                    ? "Jump to a page…"
                    : "Search records, filters like lead: or status:New…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={
                isActionsMode
                  ? "Filter actions"
                  : isPagesMode
                    ? "Jump to page"
                    : "Search workspace"
              }
            />
            <div className="text-soft hidden shrink-0 items-center gap-1.5 text-[10px] sm:flex">
              <kbd className="border-base rounded-theme-sm border px-1.5 py-0.5 font-medium">
                &gt;
              </kbd>
              <span>Actions</span>
              {!isActionsMode ? (
                <>
                  <kbd className="border-base ml-0.5 rounded-theme-sm border px-1.5 py-0.5 font-medium">
                    CTRL
                  </kbd>
                  <span>{isPagesMode ? "Results" : "Pages"}</span>
                </>
              ) : null}
              <kbd className="border-base ml-0.5 rounded-theme-sm border px-1.5 py-0.5 font-medium">
                ESC
              </kbd>
            </div>
          </div>
        ) : null}

        <div className="border-base flex items-center gap-2 border-b px-3.5 py-2">
          <button
            type="button"
            className={cx(
              "rounded-theme-sm px-2 py-0.5 text-[11px] font-medium transition",
              !isActionsMode && !isPagesMode ? "bg-accent text-main" : "text-muted hover:text-main",
            )}
            onClick={() => {
              setNavigationMode("results");
              setFiltersMenuOpen(false);
              if (isActionsMode) setQuery("");
            }}
          >
            Results
          </button>
          <button
            type="button"
            className={cx(
              "rounded-theme-sm px-2 py-0.5 text-[11px] font-medium transition",
              isPagesMode ? "bg-accent text-main" : "text-muted hover:text-main",
            )}
            onClick={() => {
              setNavigationMode("pages");
              setFiltersMenuOpen(false);
              if (isActionsMode) setQuery("");
            }}
          >
            Pages
          </button>
          <button
            type="button"
            className={cx(
              "rounded-theme-sm px-2 py-0.5 text-[11px] font-medium transition",
              isActionsMode ? "bg-accent text-main" : "text-muted hover:text-main",
            )}
            onClick={() => {
              setFiltersMenuOpen(false);
              enterActionsMode();
            }}
          >
            Actions
          </button>

          {!isActionsMode && !isPagesMode ? (
            <div className="relative ml-1" ref={filtersMenuRef}>
              <button
                type="button"
                className={cx(
                  "rounded-theme-sm px-2 py-0.5 text-[11px] font-medium transition",
                  filtersMenuOpen || parsedQuery.tokens.length > 0
                    ? "bg-accent text-main"
                    : "text-muted hover:text-main",
                )}
                aria-expanded={filtersMenuOpen}
                aria-haspopup="menu"
                onClick={() => setFiltersMenuOpen((openMenu) => !openMenu)}
              >
                Filters
              </button>
              {filtersMenuOpen ? (
                <div
                  role="menu"
                  className="border-base bg-surface-elevated absolute left-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-theme-md border py-1 shadow-md"
                >
                  {SEARCH_FILTER_MENU.map((section) => (
                    <div key={section.heading}>
                      <p className="text-soft px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider">
                        {section.heading}
                      </p>
                      {section.items.map((item) => (
                        <button
                          key={item.raw}
                          type="button"
                          role="menuitem"
                          className="hover:bg-accent text-main flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition"
                          onClick={() => applyFilterExample(item)}
                        >
                          <span>{item.label}</span>
                          <span className="text-soft font-mono text-[10px]">{item.raw}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {entityContext ? (
                    <div>
                      <p className="text-soft px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider">
                        Jump
                      </p>
                      <button
                        type="button"
                        role="menuitem"
                        className="hover:bg-accent text-main flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition"
                        onClick={() => applyFilterExample(SEARCH_JUMP_FILTER)}
                      >
                        <span>{SEARCH_JUMP_FILTER.label}</span>
                        <span className="text-soft font-mono text-[10px]">
                          {SEARCH_JUMP_FILTER.raw}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <span className="text-soft ml-auto hidden text-[11px] sm:inline">
            {isActionsMode
              ? "Run a quick action"
              : isPagesMode
                ? "Navigate the app"
                : entityContext && !hasQuery
                  ? `On this ${entityContext.label}`
                  : showingRecents
                    ? "Recent visits"
                    : "Find records in your workspace"}
          </span>
        </div>

        {parsedQuery.tokens.length > 0 && !isActionsMode ? (
          <div className="border-base flex flex-wrap items-center gap-1.5 border-b px-3.5 py-2">
            {parsedQuery.tokens.map((token) => (
              <button
                key={`${token.key}-${token.value}-${token.raw}`}
                type="button"
                className="border-base bg-surface text-muted hover:text-main inline-flex items-center gap-1 rounded-theme-sm border px-2 py-0.5 text-[11px] transition"
                onClick={() => setQuery(removeSearchFilterToken(query, token.raw))}
                title={`Remove ${token.label}`}
              >
                <span>{token.label}</span>
                <Icon name="close" className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="scrollbar-theme max-h-[min(60vh,26rem)] overflow-y-auto py-1">
          {loading ? (
            <div className="text-muted flex flex-col items-center gap-2 px-4 py-10 text-center text-sm">
              <Icon name="search" className="text-soft h-5 w-5" />
              Searching…
            </div>
          ) : flatItems.length === 0 ? (
            <div>
              <div className="text-muted flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
                <Icon
                  name={isActionsMode ? "spark" : showingRecents ? "search" : "inbox"}
                  className="text-soft h-5 w-5"
                />
                {isActionsMode
                  ? "No matching actions."
                  : showingRecents
                    ? "No recent visits yet. Search or try a filter below."
                    : `No ${isPagesMode ? "pages" : "results"}${
                        hasQuery ? ` for “${query.trim()}”` : ""
                      }.`}
              </div>
              {showingRecents ? renderFilterExamples() : null}
            </div>
          ) : (
            <>
              {groupedItems.map((group) => (
                <div key={group.name} className="pb-1">
                  <p className="text-soft px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider">
                    {group.name}
                  </p>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;

                    return (
                      <PaletteItem
                        key={item.key}
                        item={item}
                        active={active}
                        onHover={() => setActiveIndex(index)}
                        onActivate={() =>
                          selectItem(item, {
                            viaLink: typeof item.onSelect !== "function",
                          })
                        }
                      />
                    );
                  })}
                </div>
              ))}
              {showingRecents ? (
                <div className="border-base mt-1 border-t pt-1">{renderFilterExamples()}</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
