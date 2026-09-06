"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Overlay } from "@/components/ui/overlay";
import { Icon } from "@/components/icons";

const QUICK_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "home", keywords: "home overview" },
  { href: "/leads", label: "Leads", icon: "users", keywords: "contacts" },
  { href: "/jobs", label: "Jobs", icon: "briefcase", keywords: "projects" },
  { href: "/tasks", label: "Tasks", icon: "checklist", keywords: "to do" },
  { href: "/invoices", label: "Invoices", icon: "invoice", keywords: "billing" },
  { href: "/files", label: "Files", icon: "folder", keywords: "documents" },
  { href: "/reports", label: "Reports", icon: "chart", keywords: "analytics" },
  { href: "/automation", label: "Automation", icon: "spark", keywords: "workflows" },
  { href: "/integrations", label: "Integrations", icon: "plug", keywords: "connections" },
  { href: "/users", label: "Users", icon: "users", keywords: "team" },
];

function flattenResults(results, query, navigationMode) {
  const output = [];
  if (navigationMode === "results") {
    for (const lead of results.leads || []) {
      output.push({
        key: `lead-${lead.id}`,
        href: `/leads/${lead.id}`,
        label: `${lead.first_name} ${lead.last_name}`.trim() || `Lead #${lead.id}`,
        sublabel: lead.email || lead.status || "Lead",
        group: "Leads",
      });
    }
    for (const job of results.jobs || []) {
      output.push({
        key: `job-${job.id}`,
        href: `/jobs/${job.id}`,
        label: job.title || `Job #${job.id}`,
        sublabel: job.address || job.status || "Job",
        group: "Jobs",
      });
    }
    for (const task of results.tasks || []) {
      output.push({
        key: `task-${task.id}`,
        href: `/tasks/${task.id}`,
        label: task.title || `Task #${task.id}`,
        sublabel: task.status || "Task",
        group: "Tasks",
      });
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (navigationMode === "pages") {
    for (const page of QUICK_NAV_ITEMS) {
      if (`${page.label} ${page.keywords}`.toLowerCase().includes(normalizedQuery)) {
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

export function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ leads: [], jobs: [], tasks: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigationMode, setNavigationMode] = useState("results");
  const inputRef = useRef(null);

  const flatItems = useMemo(
    () => flattenResults(results, query, navigationMode),
    [results, query, navigationMode],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ leads: [], jobs: [], tasks: [] });
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api(`/search?q=${encodeURIComponent(trimmed)}`);
        setResults({
          leads: data.leads || [],
          jobs: data.jobs || [],
          tasks: data.tasks || [],
        });
      } catch (_e) {
        setResults({ leads: [], jobs: [], tasks: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  useEffect(() => {
    setActiveIndex(0);
    setNavigationMode("results");
  }, [query, open]);

  if (!open) return null;

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "Control") {
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
      const selected = flatItems[activeIndex];
      if (selected) {
        onClose();
        router.push(selected.href);
      }
    }
  }

  return (
    <Overlay
      layer="palette"
      className="p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="dropdown-panel mx-auto mt-[10vh] w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-base flex items-center gap-2 border-b p-3">
          <Icon name="search" className="text-muted h-4 w-4 shrink-0" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            placeholder="Search leads, jobs, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="text-soft hidden items-center gap-1 text-[10px] sm:flex">
            <kbd className="rounded-theme-sm border px-1.5 py-0.5">CTRL</kbd>
            <span>{navigationMode === "results" ? "Pages" : "Results"}</span>
            <kbd className="ml-1 rounded-theme-sm border px-1.5 py-0.5">ESC</kbd>
          </div>
        </div>

        <div className="scrollbar-theme max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <div className="text-muted p-4 text-sm">Searching...</div>
          ) : !query.trim() ? (
            <div className="text-muted p-4 text-sm">Type to search.</div>
          ) : flatItems.length === 0 ? (
            <div className="text-muted p-4 text-sm">No results.</div>
          ) : (
            <div className="space-y-1">
              {flatItems.map((item, index) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onClose}
                  className={`block rounded-theme-md border px-3 py-2 transition ${
                    index === activeIndex ? "bg-accent border-strong" : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon ? <Icon name={item.icon} className="text-muted h-4 w-4" /> : null}
                    <div className="text-muted text-[11px] uppercase tracking-wide">
                      {item.group}
                    </div>
                  </div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-muted text-xs">{item.sublabel}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
