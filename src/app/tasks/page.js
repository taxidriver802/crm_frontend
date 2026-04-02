"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { formatDue } from "@/lib/helper";

export default function TasksPage() {
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [leadId, setLeadId] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status && status !== "All") {
      params.set("status", status);
    }

    if (leadId.trim()) {
      params.set("leadId", leadId.trim());
    }

    if (title.trim()) {
      params.set("q", title.trim());
    }

    params.set("limit", "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [status, leadId, title]);

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const data = await api("/tasks/summary");
      setSummary(data);
    } catch (e) {
      setError(e.message || "Failed to load task summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadTasks() {
    setLoadingTasks(true);
    try {
      const data = await api(`/tasks${queryString}`);
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadSummary(), loadTasks()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function setTaskStatus(taskId, nextStatus) {
    try {
      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to update task");
    }
  }

  return (
    <AppShell title="Tasks">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        {/* Buckets */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Bucket
            title="Overdue"
            tone="danger"
            loading={loadingSummary}
            items={summary?.overdueTasks || []}
            onComplete={(id) => setTaskStatus(id, "Completed")}
          />
          <Bucket
            title="Due today"
            tone="warning"
            loading={loadingSummary}
            items={summary?.dueTodayTasks || []}
            onComplete={(id) => setTaskStatus(id, "Completed")}
          />
          <Bucket
            title="Next up"
            tone="neutral"
            loading={loadingSummary}
            items={summary?.nextUp || []}
            onComplete={(id) => setTaskStatus(id, "Completed")}
          />
        </section>

        {/* Filters */}
        <section className="bg-surface border-base rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-56">
              <label className="text-muted text-xs">Status</label>
              <select
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="text-muted text-xs">Title</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Filter by title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Link
                href="/tasks/new"
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              >
                New Task
              </Link>
              <button
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
                onClick={refreshAll}
                disabled={loadingSummary || loadingTasks}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-surface border-base overflow-hidden rounded-lg border">
          <div className="border-base text-muted border-b p-4 text-sm">
            {loadingTasks
              ? "Loading…"
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent-soft">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loadingTasks && tasks.length === 0 ? (
                  <tr className="border-base border-t">
                    <td className="text-muted px-4 py-6" colSpan={5}>
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr
                      key={t.id}
                      className="border-base hover:bg-accent-soft border-t transition"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/tasks/${t.id}`} className="block hover:opacity-80">
                          <div className="font-medium underline underline-offset-4">
                            {t.title}
                          </div>
                          {t.description ? (
                            <div className="text-muted mt-1 text-xs">{t.description}</div>
                          ) : null}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          className="underline underline-offset-4 hover:opacity-80"
                          href={`/leads/${t.lead_id}`}
                        >
                          {t.lead_first_name && t.lead_last_name
                            ? `${t.lead_first_name} ${t.lead_last_name}`
                            : `Lead #${t.lead_id}`}
                        </Link>
                      </td>

                      <td className="px-4 py-3">{formatDue(t.due_date)}</td>

                      <td className="px-4 py-3">
                        <span className="border-base bg-surface inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {t.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-xs"
                          >
                            View
                          </Link>

                          <Link
                            href={`/tasks/${t.id}/edit`}
                            className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-xs"
                          >
                            Edit
                          </Link>

                          {t.status === "Completed" ? (
                            <button
                              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-xs"
                              onClick={() => setTaskStatus(t.id, "Pending")}
                            >
                              Mark pending
                            </button>
                          ) : (
                            <button
                              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-xs"
                              onClick={() => setTaskStatus(t.id, "Completed")}
                            >
                              Mark completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Bucket({ title, tone, loading, items, onComplete }) {
  const toneClass =
    tone === "danger"
      ? "border-l-4 border-l-red-500/70"
      : tone === "warning"
        ? "border-l-4 border-l-yellow-500/70"
        : "";

  return (
    <div
      className={`bg-surface border-base rounded-lg border ${toneClass} flex h-[320px] flex-col overflow-hidden`}
    >
      <div className="border-base shrink-0 border-b px-4 py-3">
        <div className="font-semibold">{title}</div>
        <div className="text-muted text-sm">
          {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {loading ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-muted text-sm">None</div>
        ) : (
          items.map((t) => (
            <div key={t.id} className="border-base bg-surface rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-muted text-sm">
                    {(t.lead_first_name && t.lead_last_name
                      ? `${t.lead_first_name} ${t.lead_last_name}`
                      : `Lead #${t.lead_id}`) +
                      " • " +
                      formatDue(t.due_date)}
                  </div>
                </div>

                {t.status !== "Completed" ? (
                  <button
                    className="border-base bg-surface hover:bg-accent-soft shrink-0 rounded-md border px-3 py-2 text-xs"
                    onClick={() => onComplete(t.id)}
                  >
                    Done
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
