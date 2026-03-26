"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await api(`/tasks/${id}`);
        if (!alive) return;

        setTask(res?.task ?? res);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load task");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) load();

    return () => {
      alive = false;
    };
  }, [id]);

  async function updateStatus(nextStatus) {
    try {
      setBusy(true);
      setError("");

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      const res = await api(`/tasks/${id}`);
      setTask(res?.task ?? res);
    } catch (e) {
      setError(e?.message || "Failed to update task");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      setBusy(true);
      router.push("/tasks");

      api(`/tasks/${id}`, { method: "DELETE" }).catch((e) => {
        alert(e?.message || "Failed to delete task");
      });
    } catch (e) {
      alert(e?.message || "Failed to delete task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={`Task #${id}`}>
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <section className="bg-surface border-base rounded-lg border p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : !task ? (
            <div className="text-muted-foreground text-sm">Not found.</div>
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
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {task.status ?? "—"}
                  </span>

                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {formatDue(task.due_date)}
                  </span>
                </div>

                {task.description ? (
                  <div>
                    <div className="text-muted-foreground text-xs">Description</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">
                      {task.description}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-muted-foreground text-xs">Description</div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      No description provided.
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="border-base hover:bg-accent-soft self-start rounded-md border p-2 disabled:opacity-60"
                onClick={handleDelete}
                disabled={busy}
                aria-label="Delete task"
                title="Delete task"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </section>

        {!loading && task ? (
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/tasks/${id}/edit`}
                className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              >
                Edit
              </Link>

              {task.status === "Completed" ? (
                <button
                  type="button"
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                  onClick={() => updateStatus("Pending")}
                  disabled={busy}
                >
                  Mark pending
                </button>
              ) : (
                <button
                  type="button"
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                  onClick={() => updateStatus("Completed")}
                  disabled={busy}
                >
                  Mark completed
                </button>
              )}

              {task.lead_id ? (
                <Link
                  href={`/leads/${task.lead_id}`}
                  className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
                >
                  View lead
                </Link>
              ) : null}
            </div>

            <button
              type="button"
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              onClick={() => router.push("/tasks")}
            >
              Back to tasks
            </button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatDue(dueDate) {
  if (!dueDate) return "No due date";

  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return dueDate;

  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
