"use client";

import { useCallback, useMemo, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "@/components/icons";
import { Menu, MenuCheckbox, MenuDivider, MenuItem, MenuLabel } from "@/components/ui/menu";
import { useWorkspace } from "@/components/workspace/workspace-provider";

/** Tabs that keep their place in the URL (?tab=) so links and refresh land on the same view. */
export function useUrlTab(defaultTab, allowed) {
  const [tab, setTabState] = useState(() => {
    if (typeof window === "undefined") return defaultTab;
    const fromUrl = new URL(window.location.href).searchParams.get("tab");
    return allowed.includes(fromUrl) ? fromUrl : defaultTab;
  });
  const setTab = useCallback(
    (next) => {
      setTabState(next);
      const url = new URL(window.location.href);
      if (next === defaultTab) url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url.toString());
    },
    [defaultTab],
  );
  return [tab, setTab];
}

export function Tabs({ tabs, value, onChange, label }) {
  function onKeyDown(event) {
    const index = tabs.findIndex((t) => t.id === value);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      onChange(next.id);
      requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
    }
  }
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          type="button"
          role="tab"
          className="tab"
          aria-selected={value === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? <span className="tab-count num">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, active, children }) {
  if (!active) return null;
  return (
    <div id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} className="record-main">
      {children}
    </div>
  );
}

/**
 * Which sections a record's Overview shows, and in what order, per person.
 * `catalog` is [{ id, label }]; saved under preferences.records[recordKey].
 */
export function useRecordSections(recordKey, catalog) {
  const { prefs, updatePrefs } = useWorkspace();
  const savedRecord = prefs.records?.[recordKey];
  const saved = useMemo(() => savedRecord || {}, [savedRecord]);
  const savedSections = Array.isArray(saved.sections) ? saved.sections : [];
  const known = new Map(catalog.map((c) => [c.id, c]));
  const ordered = [
    ...savedSections.filter((s) => known.has(s.id)).map((s) => ({ ...known.get(s.id), hidden: Boolean(s.hidden) })),
    ...catalog.filter((c) => !savedSections.some((s) => s.id === c.id)).map((c) => ({ ...c, hidden: Boolean(c.hidden) })),
  ];
  const railVisible = saved.rail !== false;

  const save = useCallback(
    (patch) => updatePrefs({ records: { [recordKey]: { ...saved, ...patch } } }),
    [updatePrefs, recordKey, saved],
  );

  const setSections = useCallback(
    (next) => save({ sections: next.map((s) => ({ id: s.id, hidden: Boolean(s.hidden) })) }),
    [save],
  );

  return {
    sections: ordered,
    railVisible,
    setRailVisible: (visible) => save({ rail: visible }),
    setSections,
    reset: () => updatePrefs({ records: { [recordKey]: null } }),
  };
}

export function SectionArranger({ sections, setSections, reset, label = "Arrange overview" }) {
  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }
  return (
    <Menu
      align="end"
      label={label}
      className="w-72"
      trigger={(props) => (
        <button type="button" {...props} className="btn btn-sm btn-ghost" aria-label={label}>
          <Icon name="layout" className="h-3.5 w-3.5" />
          Arrange
        </button>
      )}
    >
      {() => (
        <>
          <MenuLabel>Show on Overview</MenuLabel>
          {sections.map((section, index) => (
            <div key={section.id} className="flex items-center gap-1 pr-1">
              <div className="min-w-0 flex-1">
                <MenuCheckbox
                  checked={!section.hidden}
                  onChange={(on) =>
                    setSections(sections.map((s) => (s.id === section.id ? { ...s, hidden: !on } : s)))
                  }
                >
                  {section.label}
                </MenuCheckbox>
              </div>
              <button
                type="button"
                className={cx("icon-btn icon-btn-quiet h-6 w-6")}
                aria-label={`Move ${section.label} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon name="chevronUp" className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-6 w-6"
                aria-label={`Move ${section.label} down`}
                disabled={index === sections.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon name="chevronDown" className="h-3 w-3" />
              </button>
            </div>
          ))}
          <MenuDivider />
          <MenuItem onSelect={reset}>Reset layout</MenuItem>
        </>
      )}
    </Menu>
  );
}

export function RailPanel({ title, children, right }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3 className="panel-title">{title}</h3>
        {right}
      </div>
      <div className="panel-body space-y-2">{children}</div>
    </section>
  );
}
