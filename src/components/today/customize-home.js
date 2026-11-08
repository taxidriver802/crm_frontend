"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useToast } from "@/components/toast/toast-provider";
import { resolveWidgets } from "@/lib/preferences";
import { cx } from "@/lib/cx";

function toPref(widgets) {
  return widgets.map((w) => ({ id: w.id, column: w.column, hidden: Boolean(w.hidden) }));
}

/**
 * Edit Today in place: what shows, in which column, in what order. Changes
 * save as you make them (they are your preferences, not a draft). Admins can
 * hand their layout to everyone who has not made their own.
 */
export function CustomizeHome({ onDone }) {
  const { prefs, role, isAdmin, updatePrefs, saveAsDefaults } = useWorkspace();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const widgets = resolveWidgets(prefs.home, role);

  function save(next) {
    updatePrefs({ home: { widgets: toPref(next) } });
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    save(next);
  }

  function patch(index, change) {
    save(widgets.map((w, i) => (i === index ? { ...w, ...change } : w)));
  }

  async function shareWithTeam() {
    setBusy(true);
    try {
      await saveAsDefaults({ home: { widgets: toPref(widgets) } });
      showToast("Your Today layout is now the team default.", { tone: "success" });
    } catch (e) {
      showToast(e?.message || "Could not save the team default", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-label="Customize Today" data-testid="customize-home">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Customize Today</h2>
          <p className="text-xs text-muted">Changes save to your account and follow you to every device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => updatePrefs({ home: null })}>
            Reset
          </button>
          {isAdmin ? (
            <button type="button" className="btn btn-sm" onClick={shareWithTeam} disabled={busy}>
              Make team default
            </button>
          ) : null}
          {onDone ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={onDone}>
              Done
            </button>
          ) : null}
        </div>
      </div>
      <ol className="space-y-1.5 p-3">
        {widgets.map((widget, index) => (
          <li
            key={widget.id}
            className={cx("customize-row", widget.hidden && "customize-row-hidden")}
            data-widget-row={widget.id}
          >
            <div className="flex flex-col">
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-6 w-6"
                aria-label={`Move ${widget.label} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon name="chevronUp" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-quiet h-6 w-6"
                aria-label={`Move ${widget.label} down`}
                disabled={index === widgets.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon name="chevronDown" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{widget.label}</div>
              <div className="truncate text-xs text-muted">{widget.description}</div>
            </div>
            <select
              className="input w-auto"
              value={widget.column}
              aria-label={`${widget.label} column`}
              onChange={(e) => patch(index, { column: e.target.value })}
            >
              <option value="main">Main</option>
              <option value="side">Side</option>
            </select>
            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={!widget.hidden}
              aria-label={`${widget.hidden ? "Show" : "Hide"} ${widget.label}`}
              onClick={() => patch(index, { hidden: !widget.hidden })}
            >
              <Icon name={widget.hidden ? "eyeOff" : "eye"} className="h-3.5 w-3.5" />
              {widget.hidden ? "Hidden" : "Shown"}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
