"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatActivity, formatActivityTimestamp, getActivityHref } from "@/lib/activity";
import { JOB_PHASES, formatMoney, phaseOf } from "@/lib/job-lifecycle";
import { Icon } from "@/components/icons";
import { PeekLink } from "@/components/peek/peek-provider";
import { useToast } from "@/components/toast/toast-provider";
import { matchesQueueFilter, isOverdueItem, formatActionWhen } from "@/components/dashboard/queue";

const KIND_ICON = {
  task: "checklist",
  lead: "users",
  job: "briefcase",
  estimate: "invoice",
  invoice: "dollar",
};

export function Widget({ title, right, children, id, footer }) {
  return (
    <section className="panel" data-widget={id} aria-labelledby={`w-${id}`}>
      <div className="panel-head">
        <h2 id={`w-${id}`} className="panel-title">
          {title}
        </h2>
        {right}
      </div>
      <div className="p-2">{children}</div>
      {footer ? <div className="border-t border-base px-4 py-2 text-xs text-muted">{footer}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

const NEEDS_FILTERS = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Late" },
  { id: "money", label: "Money" },
  { id: "waiting", label: "Waiting" },
  { id: "pipeline", label: "Pipeline" },
];

function toneFor(item) {
  if (isOverdueItem(item)) return "danger";
  if (item.reason === "Work complete, not invoiced" || item.reason === "Sold, not scheduled") return "warning";
  return null;
}

export function NeedsYouWidget({ items, loading, onTaskDone }) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [doneIds, setDoneIds] = useState(() => new Set());

  const visible = items.filter((item) => !(item.kind === "task" && doneIds.has(item.id)));
  const filtered = visible.filter((item) => matchesQueueFilter(item, filter));
  const shown = expanded ? filtered : filtered.slice(0, 8);

  async function complete(item) {
    setDoneIds((prev) => new Set(prev).add(item.id));
    try {
      await api(`/tasks/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Completed" }) });
      onTaskDone?.();
      showToast(`Completed “${item.title}”`, {
        tone: "success",
        action: {
          label: "Undo",
          onClick: async () => {
            await api(`/tasks/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Pending" }) });
            setDoneIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
            onTaskDone?.();
          },
        },
      });
    } catch (e) {
      setDoneIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      showToast(e?.message || "Could not complete the task", { tone: "danger" });
    }
  }

  const counts = Object.fromEntries(
    NEEDS_FILTERS.map((f) => [f.id, visible.filter((item) => matchesQueueFilter(item, f.id)).length]),
  );

  return (
    <Widget
      id="needs-you"
      title="Needs you"
      right={
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter what needs you">
          {NEEDS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx("note-type", filter === f.id && "note-type-on")}
            >
              {f.label}
              {counts[f.id] ? <span className="ml-1 opacity-70 num">{counts[f.id]}</span> : null}
            </button>
          ))}
        </div>
      }
      footer={
        filtered.length > 8 ? (
          <button type="button" className="link" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer" : `Show all ${filtered.length}`}
          </button>
        ) : null
      }
    >
      {loading ? (
        <div className="space-y-2 p-2">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      ) : shown.length === 0 ? (
        <div className="widget-empty">
          {filter === "all" ? "Nothing needs you right now. Clear desk." : "Nothing in this slice."}
        </div>
      ) : (
        <ul data-testid="needs-you-list">
          {shown.map((item) => {
            const tone = toneFor(item);
            return (
              <li key={`${item.kind}:${item.id}`} className="work-item">
                {item.kind === "task" ? (
                  <input
                    type="checkbox"
                    className="mx-1.5"
                    aria-label={`Complete ${item.title}`}
                    onChange={() => complete(item)}
                  />
                ) : (
                  <span className={cx("work-kind", tone && `work-kind-${tone}`)}>
                    <Icon name={KIND_ICON[item.kind] || "spark"} className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="min-w-0">
                  <PeekLink kind={item.kind} id={item.id} href={item.href} className="block truncate font-medium hover:text-accent">
                    {item.title}
                  </PeekLink>
                  <div className="truncate work-reason">
                    <span className={cx(tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>
                      {item.reason}
                    </span>
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </div>
                </div>
                <span className="num text-xs text-muted">{formatActionWhen(item.at) || ""}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function timeLabel(task) {
  if (!task.due_date) return "Any time";
  const d = new Date(task.due_date);
  if (task.kind !== "appointment" && d.getHours() === 0 && d.getMinutes() === 0) return "Due";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Upcoming visits and tasks by day. In the team view each line says who. */
export function AgendaWidget({ tasks, loading, showOwner = false }) {
  const groups = [];
  const byDay = new Map();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = dayKey(task.due_date);
    if (!byDay.has(key)) {
      const group = { key, label: dayLabel(task.due_date), items: [] };
      byDay.set(key, group);
      groups.push(group);
    }
    byDay.get(key).items.push(task);
  }

  return (
    <Widget
      id="agenda"
      title="Agenda"
      right={
        <Link href="/tasks" className="link text-xs">
          Calendar
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2 p-2">
          <div className="skeleton h-9 w-full" />
          <div className="skeleton h-9 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="widget-empty">Nothing scheduled ahead.</div>
      ) : (
        <div className="space-y-2" data-testid="agenda">
          {groups.slice(0, 4).map((group) => (
            <div key={group.key}>
              <div className="eyebrow px-2 pb-1 pt-1">{group.label}</div>
              <ul>
                {group.items.map((task) => {
                  const where = task.job_title || task.lead?.name || task.job_lead?.name;
                  const who = showOwner
                    ? task.assigned_user
                      ? `${task.assigned_user.first_name || ""} ${task.assigned_user.last_name || ""}`.trim()
                      : "Unassigned"
                    : null;
                  return (
                    <li
                      key={task.id}
                      className={cx("agenda-item", task.kind === "appointment" && "agenda-item-appt")}
                    >
                      <span className="agenda-time">{timeLabel(task)}</span>
                      <div className="min-w-0">
                        <PeekLink kind="task" id={task.id} className="block truncate font-medium hover:text-accent">
                          {task.title}
                        </PeekLink>
                        {who || where || task.location ? (
                          <div className="truncate text-xs text-muted">
                            {who ? <span className="font-medium text-main">{who}</span> : null}
                            {who && (where || task.location) ? " · " : ""}
                            {[where, task.location].filter(Boolean).join(" · ")}
                          </div>
                        ) : null}
                      </div>
                      {task.kind === "appointment" ? (
                        <Icon name="calendar" className="h-3.5 w-3.5 text-accent" />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */

export function HandoffsWidget({ sold = [], ready = [], awaiting = [], loading }) {
  const lanes = [
    { id: "sold", label: "Sold, not scheduled", items: sold, empty: "Every sold job has a date." },
    { id: "ready", label: "Done, not billed", items: ready, empty: "Every finished job is billed." },
    { id: "awaiting", label: "Waiting on the client", items: awaiting, empty: "No estimates out." },
  ];
  return (
    <Widget id="handoffs" title="Handoffs">
      {loading ? (
        <div className="skeleton m-2 h-24" />
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {lanes.map((lane) => (
            <div key={lane.id} className="rounded-[10px] bg-surface p-2" data-lane={lane.id}>
              <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="text-xs font-semibold">{lane.label}</span>
                <span className="num text-xs text-muted">{lane.items.length}</span>
              </div>
              {lane.items.length === 0 ? (
                <p className="px-1 pb-1 text-xs text-muted">{lane.empty}</p>
              ) : (
                <ul className="space-y-1">
                  {lane.items.slice(0, 4).map((item) => (
                    <li key={`${item.kind}:${item.id}`}>
                      <PeekLink
                        kind={item.kind}
                        id={item.id}
                        href={item.href}
                        className="block rounded-lg bg-surface-elevated px-2.5 py-1.5 text-sm shadow-sm hover:text-accent"
                      >
                        <span className="block truncate font-medium">{item.title}</span>
                        {item.subtitle ? <span className="block truncate text-xs text-muted">{item.subtitle}</span> : null}
                      </PeekLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */

export function MoneyWidget({ money, loading }) {
  const cells = [
    { label: "Owed to you", value: money?.outstanding_total, href: "/invoices?status=Open" },
    {
      label: "Past due",
      value: money?.overdue_total,
      href: "/invoices?status=Overdue",
      tone: money?.overdue_total > 0 ? "text-danger" : null,
    },
    { label: "Approved, not billed", value: money?.unbilled_total, href: "/jobs?phase=billing" },
    { label: "Collected, 30 days", value: money?.collected_30d, href: "/reports", tone: "text-success" },
  ];
  return (
    <Widget id="money" title="Money">
      {loading ? (
        <div className="skeleton m-2 h-28" />
      ) : (
        <div className="stat-grid" data-testid="money-widget">
          {cells.map((cell) => (
            <Link key={cell.label} href={cell.href} className="stat-cell">
              <div className={cx("stat-value", cell.tone)}>{formatMoney(cell.value || 0)}</div>
              <div className="stat-label">{cell.label}</div>
            </Link>
          ))}
        </div>
      )}
    </Widget>
  );
}

export function PipelineWidget({ byStatus = [], loading }) {
  const phases = JOB_PHASES.map((phase) => ({
    ...phase,
    count: byStatus
      .filter((row) => phaseOf(row.status) === phase.id)
      .reduce((sum, row) => sum + Number(row.count || 0), 0),
  }));
  const max = Math.max(1, ...phases.map((p) => p.count));
  return (
    <Widget
      id="pipeline"
      title="Pipeline"
      right={
        <Link href="/jobs" className="link text-xs">
          All jobs
        </Link>
      }
    >
      {loading ? (
        <div className="skeleton m-2 h-28" />
      ) : (
        <div className="phase-bars p-1">
          {phases.map((phase) => (
            <Link key={phase.id} href={`/jobs?phase=${phase.id}`} className="phase-bar-row">
              <span className="text-muted">{phase.label}</span>
              <span className="phase-bar-track">
                <span
                  className="phase-bar-fill block"
                  style={{
                    width: `${(phase.count / max) * 100}%`,
                    opacity: phase.id === "lost" ? 0.35 : phase.id === "closed" ? 0.55 : 1,
                  }}
                />
              </span>
              <span className="num text-right font-semibold">{phase.count}</span>
            </Link>
          ))}
        </div>
      )}
    </Widget>
  );
}

const PIN_ICON = { job: "briefcase", lead: "users", task: "checklist", invoice: "dollar", estimate: "invoice", view: "list" };

export function PinnedWidget({ pins = [] }) {
  return (
    <Widget id="pinned" title="Pinned">
      {pins.length === 0 ? (
        <div className="widget-empty">
          Pin a record from its preview (<Icon name="pin" className="inline h-3 w-3" />) to keep it here and in the sidebar.
        </div>
      ) : (
        <ul>
          {pins.map((pin) => (
            <li key={pin.id}>
              <Link href={pin.href} className="related-line">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon name={PIN_ICON[pin.kind] || "pin"} className="h-3.5 w-3.5 text-muted" />
                  <span className="truncate">{pin.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export function TeamWidget({ rows = [], loading }) {
  const max = Math.max(1, ...rows.map((r) => r.tasks_open || 0));
  return (
    <Widget
      id="team"
      title="Team load"
      right={
        <Link href="/reports/team" className="link text-xs">
          Report
        </Link>
      }
    >
      {loading ? (
        <div className="skeleton m-2 h-24" />
      ) : rows.length === 0 ? (
        <div className="widget-empty">No teammates yet.</div>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.user_id || "unassigned"}>
              <Link
                href={`/tasks?assignedTo=${row.user_id ?? "unassigned"}`}
                className="phase-bar-row"
                title={`${row.jobs_open} open jobs · ${row.leads_open} open leads`}
              >
                <span className="truncate">{row.name}</span>
                <span className="phase-bar-track">
                  <span
                    className="phase-bar-fill block"
                    style={{
                      width: `${((row.tasks_open || 0) / max) * 100}%`,
                      background: row.tasks_overdue > 0 ? "var(--danger)" : undefined,
                    }}
                  />
                </span>
                <span className={cx("num text-right font-semibold", row.tasks_overdue > 0 && "text-danger")}>
                  {row.tasks_open}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export function ActivityWidget({ activity = [], loading }) {
  return (
    <Widget id="activity" title="Recent activity">
      {loading ? (
        <div className="skeleton m-2 h-24" />
      ) : activity.length === 0 ? (
        <div className="widget-empty">Quiet so far.</div>
      ) : (
        <ul>
          {activity.slice(0, 8).map((entry) => {
            const view = formatActivity(entry);
            const href = getActivityHref(entry);
            const body = (
              <>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{view.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {[view.subject, view.detail].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="num shrink-0 text-xs text-soft">{formatActivityTimestamp(entry)}</span>
              </>
            );
            return (
              <li key={entry.id}>
                {href ? (
                  <Link href={href} className="related-line">
                    {body}
                  </Link>
                ) : (
                  <div className="related-line">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}
