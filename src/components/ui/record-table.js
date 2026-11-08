"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "@/components/icons";
import {
  Menu,
  MenuCheckbox,
  MenuDivider,
  MenuItem,
  MenuLabel,
} from "@/components/ui/menu";
import { useOptionalWorkspace } from "@/components/workspace/workspace-provider";
import { usePeek } from "@/components/peek/peek-provider";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";

/**
 * The one table every work list uses (jobs, leads, tasks, invoices).
 *
 * columns: [{ id, label, render(row), sortValue?(row), align?: "right",
 *             required?: bool, default?: bool }]
 *
 * - Which columns show, in what order, and the sort are saved per person per
 *   list (preferences.lists[listKey]).
 * - Clicking a row previews it (peek); Cmd/Ctrl-click opens the full page in
 *   a new tab. Enter on a focused row previews; arrow keys move between rows.
 * - Checkboxes select; Shift-click selects a range; the bulk bar acts on all.
 * - Below 768px rows become cards with the same columns as labelled lines.
 */
export function RecordTable({
  listKey,
  kind,
  rows,
  columns,
  loading = false,
  getHref,
  selectable = false,
  bulkActions,
  emptyTitle = "Nothing here",
  emptyDescription,
  caption,
}) {
  const workspace = useOptionalWorkspace();
  const { openPeek } = usePeek();
  const phone = useMediaQuery(PHONE_QUERY);
  const savedRaw = workspace?.prefs?.lists?.[listKey];
  const saved = useMemo(() => savedRaw || {}, [savedRaw]);
  const [selected, setSelected] = useState(() => new Set());
  const lastClicked = useRef(null);
  const bodyRef = useRef(null);

  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const defaultIds = useMemo(
    () => columns.filter((c) => c.required || c.default !== false).map((c) => c.id),
    [columns],
  );
  const visibleIds = useMemo(() => {
    const chosen =
      Array.isArray(saved.columns) && saved.columns.length ? saved.columns : defaultIds;
    const ids = chosen.filter((id) => byId.has(id));
    for (const c of columns) if (c.required && !ids.includes(c.id)) ids.unshift(c.id);
    return ids;
  }, [saved.columns, defaultIds, byId, columns]);
  const visible = visibleIds.map((id) => byId.get(id));
  const sort = saved.sort || null;

  const save = useCallback(
    (patch) => {
      workspace?.updatePrefs({ lists: { [listKey]: { ...saved, ...patch } } });
    },
    [workspace, listKey, saved],
  );

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = byId.get(sort.key);
    if (!column) return rows;
    const value = column.sortValue || ((row) => row[column.id]);
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [rows, sort, byId]);

  function toggleSort(column) {
    if (!sort || sort.key !== column.id) save({ sort: { key: column.id, dir: "asc" } });
    else if (sort.dir === "asc") save({ sort: { key: column.id, dir: "desc" } });
    else save({ sort: null });
  }

  function toggleColumn(id, on) {
    const next = on ? [...visibleIds, id] : visibleIds.filter((c) => c !== id);
    save({ columns: next });
  }

  function moveColumn(id, delta) {
    const index = visibleIds.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= visibleIds.length) return;
    const next = [...visibleIds];
    [next[index], next[target]] = [next[target], next[index]];
    save({ columns: next });
  }

  function open(row, event) {
    if (event && (event.metaKey || event.ctrlKey)) {
      const href = getHref?.(row);
      if (href) window.open(href, "_blank", "noopener");
      return;
    }
    openPeek(kind, row.id);
  }

  function onRowClick(row, event) {
    if (event.target.closest("a, button, input, select, label, textarea")) return;
    open(row, event);
  }

  function onRowKey(row, event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(row, event);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const all = Array.from(bodyRef.current?.querySelectorAll("[data-row]") || []);
      const index = all.indexOf(event.currentTarget);
      const next = all[index + (event.key === "ArrowDown" ? 1 : -1)];
      next?.focus();
    } else if (event.key === "x" && selectable) {
      toggleRow(row, {});
    }
  }

  function toggleRow(row, event) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (event?.shiftKey && lastClicked.current != null) {
        const ids = sortedRows.map((r) => r.id);
        const a = ids.indexOf(lastClicked.current);
        const b = ids.indexOf(row.id);
        const [from, to] = a < b ? [a, b] : [b, a];
        const on = !prev.has(row.id);
        for (const id of ids.slice(from, to + 1)) {
          if (on) next.add(id);
          else next.delete(id);
        }
      } else if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      lastClicked.current = row.id;
      return next;
    });
  }

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));
  const selectedRows = sortedRows.filter((r) => selected.has(r.id));
  const clear = () => setSelected(new Set());

  const displayMenu = (
    <Menu
      align="end"
      label="Display options"
      className="w-72"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="btn btn-sm"
          aria-label="Display options"
        >
          <Icon name="columns" className="h-3.5 w-3.5" />
          Display
        </button>
      )}
    >
      {() => (
        <>
          <MenuLabel>Columns</MenuLabel>
          {visible.map((column, index) => (
            <div key={column.id} className="flex items-center gap-1 pr-1">
              <div className="min-w-0 flex-1">
                <MenuCheckbox
                  checked
                  disabled={column.required}
                  onChange={(on) => toggleColumn(column.id, on)}
                >
                  {column.label}
                </MenuCheckbox>
              </div>
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-6 w-6"
                aria-label={`Move ${column.label} left`}
                disabled={index === 0}
                onClick={() => moveColumn(column.id, -1)}
              >
                <Icon name="chevronUp" className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-6 w-6"
                aria-label={`Move ${column.label} right`}
                disabled={index === visible.length - 1}
                onClick={() => moveColumn(column.id, 1)}
              >
                <Icon name="chevronDown" className="h-3 w-3" />
              </button>
            </div>
          ))}
          {columns
            .filter((c) => !visibleIds.includes(c.id))
            .map((column) => (
              <MenuCheckbox
                key={column.id}
                checked={false}
                onChange={(on) => toggleColumn(column.id, on)}
              >
                {column.label}
              </MenuCheckbox>
            ))}
          <MenuDivider />
          <MenuLabel>Density</MenuLabel>
          <MenuCheckbox
            checked={workspace?.prefs?.appearance?.density === "compact"}
            onChange={(on) =>
              workspace?.updatePrefs({
                appearance: { density: on ? "compact" : "comfortable" },
              })
            }
          >
            Compact rows everywhere
          </MenuCheckbox>
          <MenuDivider />
          <MenuItem
            onSelect={() => workspace?.updatePrefs({ lists: { [listKey]: null } })}
          >
            Reset columns and sort
          </MenuItem>
        </>
      )}
    </Menu>
  );

  const sortIcon = (column) =>
    sort?.key === column.id ? (
      <Icon name={sort.dir === "desc" ? "arrowDown" : "arrowUp"} className="h-3 w-3" />
    ) : null;

  return (
    <div className="space-y-2" data-list={listKey}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="text-xs text-muted">
          {loading
            ? "Loading…"
            : caption || `${rows.length} ${rows.length === 1 ? "row" : "rows"}`}
          {sort && byId.get(sort.key)
            ? ` · sorted by ${byId.get(sort.key).label.toLowerCase()}`
            : ""}
        </div>
        {displayMenu}
      </div>

      {/* Table (md and up); phones get cards instead, never both in the DOM. */}
      {phone ? null : (
        <div className="wtable-wrap">
          <table className="wtable" aria-rowcount={sortedRows.length}>
            <thead>
              <tr>
                {selectable ? (
                  <th className="col-check">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(
                          allSelected ? new Set() : new Set(sortedRows.map((r) => r.id)),
                        )
                      }
                    />
                  </th>
                ) : null}
                {visible.map((column) => (
                  <th
                    key={column.id}
                    className={cx(column.align === "right" && "col-num")}
                    aria-sort={
                      sort?.key === column.id
                        ? sort.dir === "desc"
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    <button type="button" onClick={() => toggleSort(column)}>
                      {column.label}
                      {sortIcon(column)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {loading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`s${i}`}>
                    <td colSpan={visible.length + (selectable ? 1 : 0)}>
                      <div className="skeleton h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visible.length + (selectable ? 1 : 0)}
                    className="wtable-empty"
                  >
                    <div className="font-medium text-main">{emptyTitle}</div>
                    {emptyDescription ? (
                      <div className="mt-1 text-sm">{emptyDescription}</div>
                    ) : null}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr
                    key={row.id}
                    data-row={row.id}
                    tabIndex={0}
                    aria-selected={selected.has(row.id)}
                    onClick={(event) => onRowClick(row, event)}
                    onKeyDown={(event) => onRowKey(row, event)}
                  >
                    {selectable ? (
                      <td className="col-check">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selected.has(row.id)}
                          onChange={() => {}}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(row, event);
                          }}
                        />
                      </td>
                    ) : null}
                    {visible.map((column) => (
                      <td
                        key={column.id}
                        className={cx(column.align === "right" && "col-num")}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards (phones) */}
      {phone ? (
        <div>
          {loading && rows.length === 0 ? (
            <div className="wcards">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="wcard">
                  <div className="skeleton h-10 w-full" />
                </div>
              ))}
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="wcards wtable-empty">
              <div className="font-medium text-main">{emptyTitle}</div>
              {emptyDescription ? (
                <div className="mt-1 text-sm">{emptyDescription}</div>
              ) : null}
            </div>
          ) : (
            <ul className="wcards">
              {sortedRows.map((row) => {
                const [first, ...rest] = visible;
                return (
                  <li
                    key={row.id}
                    className="wcard"
                    data-selected={selected.has(row.id) ? "true" : undefined}
                    onClick={(event) => onRowClick(row, event)}
                    data-row-card={row.id}
                  >
                    {selectable ? (
                      <input
                        type="checkbox"
                        className="mt-1"
                        aria-label="Select row"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row, {})}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="min-w-0">{first?.render(row)}</div>
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {rest.slice(0, 4).map((column) => (
                          <div
                            key={column.id}
                            className="flex min-w-0 items-center gap-1.5"
                          >
                            <dt className="text-soft">{column.label}</dt>
                            <dd className="min-w-0 truncate">{column.render(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {selectable && selectedRows.length > 0 ? (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <span className="font-semibold">{selectedRows.length} selected</span>
          {bulkActions?.(selectedRows, clear)}
          <button type="button" className="btn btn-sm" onClick={clear}>
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Runs one request per selected record and reports how many landed. */
export async function runBulk(rows, action) {
  const results = await Promise.allSettled(rows.map((row) => action(row)));
  const failed = results.filter((r) => r.status === "rejected");
  return {
    ok: results.length - failed.length,
    failed: failed.length,
    firstError: failed[0]?.reason?.message || null,
  };
}
