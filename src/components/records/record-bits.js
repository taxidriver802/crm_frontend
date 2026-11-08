"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDate, formatDateTime } from "@/lib/helper";
import { JOB_PHASES, formatMoney, phaseOf } from "@/lib/job-lifecycle";
import { toneFor } from "@/lib/status-tones";
import { useToast } from "@/components/toast/toast-provider";
import { Icon } from "@/components/icons";
import { PeekLink } from "@/components/peek/peek-provider";

/* ------------------------------------------------------------------ */
/* Small typographic pieces                                            */
/* ------------------------------------------------------------------ */

export function Eyebrow({ children, className }) {
  return <div className={cx("eyebrow", className)}>{children}</div>;
}

export function StatusPill({ kind, status, className }) {
  if (!status) return null;
  const tone = toneFor(kind, status);
  return (
    <span className={cx("pill", `pill-${tone}`, className)}>
      <span className="pill-dot" aria-hidden />
      {status}
    </span>
  );
}

const HEALTH_LABEL = { red: "Needs attention", yellow: "Watch", green: "On track" };

export function HealthDot({ health, withLabel = false }) {
  if (!health || health.level === "none") return null;
  const label = HEALTH_LABEL[health.level] || "";
  const reasons = (health.reasons || []).join(", ");
  return (
    <span
      className={cx("health", `health-${health.level}`)}
      title={reasons ? `${label}: ${reasons}` : label}
    >
      <span className="health-dot" aria-hidden />
      {withLabel ? <span>{reasons || label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

const RAIL_PHASES = JOB_PHASES.filter((p) => p.id !== "lost");

/** Where a job sits from selling to closed, in one glance. */
export function PhaseRail({ status, className }) {
  const current = phaseOf(status);
  const lost = status === "Lost";
  const index = RAIL_PHASES.findIndex((p) => p.id === current);
  return (
    <div className={cx("phase-rail", lost && "phase-rail-lost", className)} aria-label={`Phase: ${lost ? "Lost" : RAIL_PHASES[index]?.label}`}>
      {RAIL_PHASES.map((phase, i) => (
        <div
          key={phase.id}
          className={cx(
            "phase-seg",
            !lost && i < index && "phase-seg-done",
            !lost && i === index && "phase-seg-current",
          )}
        >
          <span className="phase-seg-bar" aria-hidden />
          <span className="phase-seg-label">{phase.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export function MoneyStrip({ money, className }) {
  if (!money) return null;
  const items = [
    { label: "Contract", value: money.contract_total },
    { label: "Invoiced", value: money.invoiced_total },
    { label: "Collected", value: money.collected_total, tone: money.collected_total > 0 ? "success" : null },
    {
      label: "Balance",
      value: money.outstanding_total,
      tone: money.overdue_total > 0 ? "danger" : money.outstanding_total > 0 ? "warning" : null,
    },
  ];
  return (
    <dl className={cx("money-strip", className)}>
      {items.map((item) => (
        <div key={item.label} className="money-cell">
          <dt>{item.label}</dt>
          <dd className={cx("num", item.tone && `text-${item.tone}`)}>{formatMoney(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Quick tasks                                                         */
/* ------------------------------------------------------------------ */

function isDone(task) {
  return task.status === "Completed";
}

function isLate(task) {
  if (isDone(task) || !task.due_date) return false;
  return new Date(task.end_at || task.due_date).getTime() < Date.now();
}

/**
 * Open work on a lead or job: tick it off (with Undo) or add one in a line.
 * The full task form stays one click away for dates, kinds and assignment.
 */
export function QuickTasks({ entityType, entityId, limit = 6, onChanged, showDone = false }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const path =
        entityType === "job"
          ? `/jobs/${entityId}/tasks`
          : `/tasks?leadId=${entityId}&limit=50&offset=0&view=all`;
      const res = await api(path);
      setTasks(res.tasks || []);
      setError("");
    } catch (e) {
      setError(e?.message || "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function setStatus(task, status, { undoable = true } = {}) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      onChanged?.();
      if (undoable && status === "Completed") {
        showToast(`Completed “${task.title}”`, {
          tone: "success",
          action: { label: "Undo", onClick: () => setStatus(task, "Pending", { undoable: false }) },
        });
      }
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      showToast(e?.message || "Could not update the task", { tone: "danger" });
    }
  }

  async function addTask(event) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const body = { title: clean, status: "Pending", kind: "task" };
      if (entityType === "job") body.job_id = Number(entityId);
      else body.lead_id = Number(entityId);
      const res = await api("/tasks", { method: "POST", body: JSON.stringify(body) });
      setTasks((prev) => [res.task, ...prev]);
      setTitle("");
      onChanged?.();
    } catch (e) {
      showToast(e?.message || "Could not add the task", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  const open = tasks
    .filter((t) => !isDone(t))
    .sort((a, b) => {
      const at = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bt = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return at - bt;
    });
  const done = tasks.filter(isDone);
  const shown = open.slice(0, limit);

  return (
    <div className="space-y-2">
      <form onSubmit={addTask} className="quick-add">
        <Icon name="plus" className="h-3.5 w-3.5 text-soft" />
        <input
          className="quick-add-input"
          placeholder="Add a task and press Enter"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          aria-label="New task title"
        />
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? (
        <div className="skeleton h-8 w-full" />
      ) : shown.length === 0 ? (
        <p className="px-1 text-sm text-muted">Nothing open.</p>
      ) : (
        <ul className="task-lines">
          {shown.map((task) => (
            <li key={task.id} className="task-line">
              <input
                type="checkbox"
                checked={false}
                onChange={() => setStatus(task, "Completed")}
                aria-label={`Complete ${task.title}`}
              />
              <PeekLink kind="task" id={task.id} className="task-line-title">
                {task.kind === "appointment" ? (
                  <Icon name="calendar" className="h-3.5 w-3.5 text-muted" />
                ) : null}
                <span className="truncate">{task.title}</span>
              </PeekLink>
              <span className={cx("task-line-due num", isLate(task) && "text-danger")}>
                {task.due_date ? formatDate(task.due_date) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open.length > shown.length ? (
        <p className="px-1 text-xs text-muted">+{open.length - shown.length} more open</p>
      ) : null}
      {showDone && done.length > 0 ? (
        <p className="px-1 text-xs text-muted">{done.length} completed</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick notes                                                         */
/* ------------------------------------------------------------------ */

const NOTE_TYPES = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "Visit" },
  { value: "note", label: "Note" },
];

const NOTE_LABEL = Object.fromEntries(NOTE_TYPES.map((t) => [t.value, t.label]));

/** Log what just happened in one line; see the last few things said. */
export function QuickNotes({ entityType, entityId, limit = 3 }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [type, setType] = useState("call");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api(`/notes?entity_type=${entityType}&entity_id=${entityId}`)
      .then((res) => {
        if (alive) setNotes(res.notes || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [entityType, entityId]);

  async function save(event) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const res = await api("/notes", {
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: Number(entityId),
          body: clean,
          type,
          direction: type === "note" ? "internal" : "outbound",
        }),
      });
      setNotes((prev) => [res.note, ...prev]);
      setBody("");
      showToast("Logged", { tone: "success" });
    } catch (e) {
      showToast(e?.message || "Could not log that", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={save} className="note-compose">
        <div className="note-types" role="radiogroup" aria-label="What happened">
          {NOTE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              className={cx("note-type", type === t.value && "note-type-on")}
              onClick={() => {
                setType(t.value);
                inputRef.current?.focus();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="quick-add-input"
            placeholder="What was said or decided?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
            aria-label="Note"
            maxLength={2000}
          />
          <button type="submit" className="btn btn-sm" disabled={busy || !body.trim()}>
            Log
          </button>
        </div>
      </form>
      {loading ? (
        <div className="skeleton h-8 w-full" />
      ) : notes.length === 0 ? (
        <p className="px-1 text-sm text-muted">No conversations logged yet.</p>
      ) : (
        <ul className="note-lines">
          {notes.slice(0, limit).map((note) => (
            <li key={note.id} className="note-line">
              <div className="note-line-meta">
                <span className="font-medium text-main">{NOTE_LABEL[note.type] || "Note"}</span>
                {note.direction && note.direction !== "internal" ? <span>· {note.direction}</span> : null}
                <span>· {formatDateTime(note.created_at)}</span>
              </div>
              <p className="note-line-body">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export function ContactLinks({ phone, email, address }) {
  const items = [
    phone ? { icon: "phone", label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` } : null,
    email ? { icon: "mail", label: email, href: `mailto:${email}` } : null,
    address
      ? {
          icon: "mapPin",
          label: address,
          href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
          external: true,
        }
      : null,
  ].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <ul className="contact-links">
      {items.map((item) => (
        <li key={item.icon}>
          <a
            href={item.href}
            className="contact-link"
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <Icon name={item.icon} className="h-3.5 w-3.5" />
            <span className="truncate">{item.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DetailList({ items }) {
  const shown = items.filter((item) => item.value != null && item.value !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="detail-list">
      {shown.map((item) => (
        <div key={item.label} className="detail-row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
