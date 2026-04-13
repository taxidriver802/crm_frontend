"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

function flattenResults(results) {
  const output = [];
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
  return output;
}

export function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ leads: [], jobs: [], tasks: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const flatItems = useMemo(() => flattenResults(results), [results]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
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
  }, [query, open]);

  if (!open) return null;

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
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
        window.location.href = selected.href;
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="dropdown-panel mx-auto mt-[10vh] w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-base border-b p-3">
          <input
            ref={inputRef}
            className="input"
            placeholder="Search leads, jobs, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
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
                  className={`block rounded-md border px-3 py-2 transition ${
                    index === activeIndex ? "bg-accent border-strong" : "hover:bg-accent"
                  }`}
                >
                  <div className="text-muted text-[11px] uppercase tracking-wide">
                    {item.group}
                  </div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-muted text-xs">{item.sublabel}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
