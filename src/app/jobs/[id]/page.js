"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

import { ToggleFormSection } from "@/components/toggle-form-section";

const JOB_STATUSES = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
];

export default function JobDetailPage() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);

  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    status: "Pending",
  });

  async function loadJob() {
    const data = await api(`/jobs/${id}`);
    setJob(data.job);
  }

  async function loadTasks() {
    setLoadingTasks(true);
    try {
      const data = await api(`/jobs/${id}/tasks`);
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e.message || "Failed to load job tasks");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([loadJob(), loadTasks()]);
    } catch (e) {
      setError(e.message || "Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  async function updateJobStatus(newStatus, nextIndex) {
    if (!job || newStatus === job.status) return;

    const currentIndex = JOB_STATUSES.indexOf(job.status ?? "New");
    const isTooFarAhead = nextIndex > currentIndex + 1;

    if (isTooFarAhead) return;

    const previous = job.status;

    setError(null);
    setJob((prev) => ({ ...prev, status: newStatus }));
    setUpdatingStatus(newStatus);

    try {
      await api(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      setJob((prev) => ({ ...prev, status: previous }));
      setError(e.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreatingTask(true);
    setError(null);

    try {
      const payload = {
        job_id: Number(id),
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
        status: taskForm.status || "Pending",
      };

      const data = await api("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((prev) => [data.task, ...prev]);
      setTaskForm({
        title: "",
        description: "",
        due_date: "",
        status: "Pending",
      });

      setIsTaskFormOpen(false);
    } catch (e) {
      setError(e.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleToggleTaskStatus(task) {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    const previousTasks = tasks;

    setError(null);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );

    try {
      await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      setTasks(previousTasks);
      setError(e.message || "Failed to update task");
    }
  }

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  return (
    <AppShell title={job ? job.title : "Job"}>
      {loading && <div>Loading...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {job && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="bg-surface border-base rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium">Job description</h2>
                  <p className="text-muted mt-1 text-xs">Overview and current status</p>
                </div>

                <span className="border-base bg-surface rounded-full border px-2.5 py-1 text-xs font-medium">
                  {job.status}
                </span>
              </div>

              <div className="border-base mt-4 border-t pt-4">
                <p className="text-muted text-sm leading-6">
                  {job.description || "No description"}
                </p>
              </div>
            </section>

            <section className="bg-surface border-base rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Pipeline</h3>
                  <p className="text-muted mt-1 text-xs">
                    Track where this job is in the workflow
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-y-3">
                {JOB_STATUSES.map((status, index) => {
                  const currentIndex = JOB_STATUSES.indexOf(job.status ?? "New");
                  const isActive = status === job.status;
                  const isCompleted = index < currentIndex;
                  const isTooFarAhead = index > currentIndex + 1;
                  const isLocked = updatingStatus !== null || isTooFarAhead || isActive;

                  return (
                    <div key={status} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => updateJobStatus(status, index)}
                        disabled={isLocked}
                        className={[
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          !isLocked && "cursor-pointer hover:opacity-80",
                          isLocked && "cursor-not-allowed",
                          isActive && "bg-main border-main cursor-default text-white",
                          isCompleted && "bg-accent border-base text-main",
                          !isActive && !isCompleted && "border-base text-muted",
                          isTooFarAhead && "opacity-50",
                          updatingStatus === status && "opacity-60",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {status}
                      </button>

                      {index < JOB_STATUSES.length - 1 && (
                        <div
                          className={[
                            "mx-2 h-px w-8",
                            index < currentIndex ? "bg-main" : "bg-[var(--border)]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-surface border-base space-y-4 rounded-lg border p-4">
              <ToggleFormSection
                title="Tasks"
                description="Create and manage tasks tied directly to this job"
                isOpen={isTaskFormOpen}
                onToggle={() => setIsTaskFormOpen((open) => !open)}
                openLabel="+ New Task"
                closeLabel="Hide Task Form"
              >
                <form
                  onSubmit={handleCreateTask}
                  className="border-base space-y-4 rounded-lg border p-4"
                >
                  <div>
                    <label className="text-muted text-xs">Title</label>
                    <input
                      className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Example: Call homeowner"
                      value={taskForm.title}
                      onChange={(e) =>
                        setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="text-muted text-xs">Description</label>
                    <textarea
                      className="border-base bg-app mt-1 min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Add task details..."
                      value={taskForm.description}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-muted text-xs">Due date</label>
                      <input
                        type="datetime-local"
                        className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={taskForm.due_date}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-muted text-xs">Status</label>
                      <select
                        className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={taskForm.status}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingTask}
                      className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {creatingTask ? "Creating..." : "Create Task"}
                    </button>
                  </div>
                </form>
              </ToggleFormSection>

              {loadingTasks ? (
                <div className="text-muted text-sm">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-muted text-sm">No tasks for this job yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border-base bg-surface flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="block hover:opacity-80"
                        >
                          <div className="font-medium underline underline-offset-4">
                            {task.title}
                          </div>

                          {task.description ? (
                            <div className="text-muted mt-1 text-sm">
                              {task.description}
                            </div>
                          ) : null}

                          <div className="text-muted mt-2 text-xs">
                            Due: {formatDateTime(task.due_date)}
                          </div>
                        </Link>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="border-base bg-surface inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {task.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-xs"
                        >
                          {task.status === "Completed"
                            ? "Mark pending"
                            : "Mark completed"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-surface border-base rounded-lg border p-4">
              <h3 className="mb-4 font-medium">Details</h3>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted text-xs">Address</dt>
                  <dd className="text-main mt-1">{job.address || "—"}</dd>
                </div>

                <div>
                  <dt className="text-muted text-xs">Current status</dt>
                  <dd className="text-main mt-1">{job.status}</dd>
                </div>

                <div>
                  <dt className="text-muted text-xs">Created</dt>
                  <dd className="text-main mt-1">{formatDate(job.created_at)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "No due date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}
