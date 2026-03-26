"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function formatDue(value) {
  if (!value) return "No due date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function isCompleted(task) {
  return String(task?.status || "").toLowerCase() === "completed";
}

function isOverdue(task) {
  if (!task?.due_date || isCompleted(task)) return false;
  const d = new Date(task.due_date);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function isDueSoon(task) {
  if (!task?.due_date || isCompleted(task)) return false;
  const now = Date.now();
  const due = new Date(task.due_date).getTime();
  if (Number.isNaN(due)) return false;
  return due > now && due <= now + 1000 * 60 * 60 * 24;
}

function buildFileUrl(file) {
  if (!file?.storage_key) return "#";
  return `${API_BASE}/uploads/${file.storage_key}`;
}

function badgeClass(task) {
  if (isCompleted(task)) {
    return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
  }

  if (isOverdue(task)) {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }

  if (isDueSoon(task)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-base bg-app text-main";
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [lead, setLead] = useState(null);
  const [files, setFiles] = useState([]);

  const [loadingTask, setLoadingTask] = useState(true);
  const [loadingLead, setLoadingLead] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");
  const [filesError, setFilesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      if (!id) return;

      try {
        setLoadingTask(true);
        setError("");

        const res = await api(`/tasks/${id}`);
        if (cancelled) return;

        const nextTask = res?.task ?? res;
        setTask(nextTask || null);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load task", e);
        setError(e?.message || "Failed to load task");
        setTask(null);
      } finally {
        if (!cancelled) setLoadingTask(false);
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      if (!task?.lead_id) {
        setLead(null);
        setLeadError("");
        return;
      }

      try {
        setLoadingLead(true);
        setLeadError("");

        const res = await api(`/leads/${task.lead_id}`);
        if (cancelled) return;

        setLead(res?.lead ?? res ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load related lead", e);
        setLead(null);
        setLeadError(e?.message || "Failed to load related lead");
      } finally {
        if (!cancelled) setLoadingLead(false);
      }
    }

    loadLead();

    return () => {
      cancelled = true;
    };
  }, [task?.lead_id]);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      if (!task?.lead_id) {
        setFiles([]);
        setFilesError("");
        return;
      }

      try {
        setLoadingFiles(true);
        setFilesError("");

        const res = await api(`/files?lead_id=${task.lead_id}`);
        if (cancelled) return;

        setFiles(res?.files || []);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load lead files", e);
        setFiles([]);
        setFilesError(e?.message || "Failed to load lead files");
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    }

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, [task?.lead_id]);

  async function refreshTask() {
    const res = await api(`/tasks/${id}`);
    const nextTask = res?.task ?? res;
    setTask(nextTask);
    return nextTask;
  }

  async function updateStatus(nextStatus) {
    try {
      setBusy(true);
      setError("");

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      await refreshTask();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to update task");
    } finally {
      setBusy(false);
    }
  }

  async function quickReschedule(daysToAdd) {
    if (!task) return;

    try {
      setBusy(true);
      setError("");

      const base = task?.due_date ? new Date(task.due_date) : new Date();
      if (Number.isNaN(base.getTime())) {
        throw new Error("Invalid due date");
      }

      const next = new Date(base);
      next.setDate(next.getDate() + daysToAdd);

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ due_date: next.toISOString() }),
      });

      await refreshTask();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to reschedule task");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      setBusy(true);
      await api(`/tasks/${id}`, { method: "DELETE" });
      router.push("/tasks");
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to delete task");
    } finally {
      setBusy(false);
    }
  }

  const recentFiles = useMemo(() => files.slice(0, 5), [files]);

  return (
    <AppShell title={`Task #${id}`}>
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <section className="bg-surface border-base rounded-lg border p-4">
          {loadingTask ? (
            <div className="text-muted-foreground text-sm">Loading task…</div>
          ) : !task ? (
            <div className="text-muted-foreground text-sm">Task not found.</div>
          ) : (
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <div className="text-2xl font-semibold">{task.title}</div>

                  <div className="text-muted-foreground mt-2 text-sm">
                    {task.lead_id ? (
                      <>
                        Related lead:{" "}
                        <Link
                          href={`/leads/${task.lead_id}`}
                          className="underline underline-offset-4 hover:opacity-80"
                        >
                          {task.lead_first_name && task.lead_last_name
                            ? `${task.lead_first_name} ${task.lead_last_name}`
                            : `Lead #${task.lead_id}`}
                        </Link>
                      </>
                    ) : (
                      "No lead linked"
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClass(task)}`}
                  >
                    {task.status ?? "—"}
                  </span>

                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {formatDue(task.due_date)}
                  </span>

                  {isOverdue(task) ? (
                    <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
                      Overdue
                    </span>
                  ) : isDueSoon(task) ? (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                      Due soon
                    </span>
                  ) : null}
                </div>

                <div>
                  <div className="text-muted-foreground text-xs">Description</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">
                    {task.description || "No description provided."}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="border-base hover:bg-accent-soft self-start rounded-md border p-2 disabled:opacity-60"
                onClick={handleDelete}
                disabled={busy}
                aria-label="Delete task"
                title="Delete task"
              >
                Delete
              </button>
            </div>
          )}
        </section>

        {!loadingTask && task ? (
          <section className="flex flex-wrap gap-2">
            <Link
              href={`/tasks/${id}/edit`}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Edit task
            </Link>

            <button
              type="button"
              onClick={() => updateStatus(isCompleted(task) ? "Pending" : "Completed")}
              disabled={busy}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            >
              {isCompleted(task) ? "Reopen task" : "Mark complete"}
            </button>

            {task.lead_id ? (
              <Link
                href={`/leads/${task.lead_id}`}
                className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              >
                View lead
              </Link>
            ) : null}

            {!isCompleted(task) ? (
              <>
                <button
                  type="button"
                  onClick={() => quickReschedule(1)}
                  disabled={busy}
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                >
                  +1 day
                </button>

                <button
                  type="button"
                  onClick={() => quickReschedule(3)}
                  disabled={busy}
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                >
                  +3 days
                </button>

                <button
                  type="button"
                  onClick={() => quickReschedule(7)}
                  disabled={busy}
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                >
                  +1 week
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => router.push("/tasks")}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Back to tasks
            </button>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">Lead Snapshot</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Quick context for doing the work tied to this task.
              </p>
            </div>

            {!task?.lead_id ? (
              <div className="text-muted-foreground text-sm">
                No lead linked to this task.
              </div>
            ) : loadingLead ? (
              <div className="text-muted-foreground text-sm">Loading lead details…</div>
            ) : leadError ? (
              <div className="text-sm text-red-500">{leadError}</div>
            ) : !lead ? (
              <div className="text-muted-foreground text-sm">
                Lead details unavailable.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Name</div>
                  <div className="mt-1 font-medium">
                    {lead.first_name} {lead.last_name}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs">Contact</div>
                  <div className="mt-1">
                    {lead.email || "—"}
                    {lead.phone ? ` • ${lead.phone}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {lead.status ?? "—"}
                  </span>

                  {lead.source ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      Source: {lead.source}
                    </span>
                  ) : null}
                </div>

                {lead.notes ? (
                  <div>
                    <div className="text-muted-foreground text-xs">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">{lead.notes}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="bg-surface border-base rounded-lg border">
            <div className="border-base flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Lead Files</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Recent files connected to this task’s lead.
                </p>
              </div>

              {task?.lead_id ? (
                <Link
                  href={`/leads/${task.lead_id}`}
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
                >
                  Open lead
                </Link>
              ) : null}
            </div>

            <div className="p-4">
              {loadingFiles ? (
                <div className="text-muted-foreground text-sm">Loading files…</div>
              ) : filesError ? (
                <div className="text-sm text-red-500">{filesError}</div>
              ) : recentFiles.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                  No lead files available for this task yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{file.original_name}</div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {file.mime_type || "Unknown type"} •{" "}
                          {formatBytes(file.size_bytes)}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Uploaded: {formatDate(file.created_at)}
                        </div>
                      </div>

                      <a
                        href={buildFileUrl(file)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:bg-accent-soft shrink-0 rounded-md border px-3 py-2 text-sm"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
