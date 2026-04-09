"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { TaskForm, createEmptyTaskForm } from "@/components/forms/task-form";
import { api } from "@/lib/api";
import { formatDue, LinkedEntityCell } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";

function SummaryCard({ label, value, sub }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-muted text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );
}

function TaskStatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") {
    return (
      <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
        Completed
      </span>
    );
  }

  return <span className="status-chip">{status || "Pending"}</span>;
}

export default function TasksPage() {
  const searchParams = useSearchParams();

  const prefillLeadId = searchParams.get("lead_id") || "";
  const prefillJobId = searchParams.get("job_id") || "";
  const shouldOpenCreate = searchParams.get("open") === "create";

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [linkedFilter, setLinkedFilter] = useState("");
  const [leadId, setLeadId] = useState("");
  const [jobId, setJobId] = useState("");

  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState("");

  const [contextType, setContextType] = useState(prefillJobId ? "job" : "lead");
  const [taskForm, setTaskForm] = useState(
    createEmptyTaskForm({
      lead_id: prefillLeadId,
      job_id: prefillJobId,
    }),
  );

  useEffect(() => {
    if (shouldOpenCreate) {
      setIsCreateOpen(true);
    }
  }, [shouldOpenCreate]);

  useEffect(() => {
    if (prefillLeadId) {
      setTaskForm((prev) => ({ ...prev, lead_id: prefillLeadId }));
      setContextType("lead");
    }
  }, [prefillLeadId]);

  useEffect(() => {
    if (prefillJobId) {
      setTaskForm((prev) => ({ ...prev, job_id: prefillJobId }));
      setContextType("job");
    }
  }, [prefillJobId]);

  function handleContextChange(type) {
    setContextType(type);
    setTaskForm((prev) => ({
      ...prev,
      lead_id: type === "lead" ? prev.lead_id : "",
      job_id: type === "job" ? prev.job_id : "",
    }));
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status && status !== "All") {
      params.set("status", status);
    }

    if (linkedFilter && linkedFilter !== "All") {
      params.set("linkedTo", linkedFilter);
    }

    if (leadId.trim()) {
      params.set("leadId", leadId.trim());
    }

    if (jobId.trim()) {
      params.set("jobId", jobId.trim());
    }

    if (title.trim()) {
      params.set("q", title.trim());
    }

    params.set("limit", "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [status, linkedFilter, leadId, jobId, title]);

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

  async function loadLeads() {
    setLoadingLeads(true);
    try {
      const data = await api("/leads?limit=200&offset=0");
      setLeads(data.leads || []);
    } catch (e) {
      setError(e.message || "Failed to load leads");
    } finally {
      setLoadingLeads(false);
    }
  }

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const data = await api("/jobs?limit=200&offset=0");
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadSummary(), loadTasks(), loadLeads(), loadJobs()]);
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

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreateError("");

    if (contextType === "lead" && !taskForm.lead_id.trim()) {
      setCreateError("Please choose a lead.");
      return;
    }

    if (contextType === "job" && !taskForm.job_id.trim()) {
      setCreateError("Please choose a job.");
      return;
    }

    if (!taskForm.title.trim()) {
      setCreateError("Title is required.");
      return;
    }

    const payload = {
      lead_id: contextType === "lead" ? Number(taskForm.lead_id) : null,
      job_id: contextType === "job" ? Number(taskForm.job_id) : null,
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      status: taskForm.status || "Pending",
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
    };

    try {
      setCreatingTask(true);

      const data = await api("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdTask = data?.task ?? null;

      setTaskForm(
        createEmptyTaskForm({
          lead_id: contextType === "lead" ? taskForm.lead_id : "",
          job_id: contextType === "job" ? taskForm.job_id : "",
        }),
      );
      setIsCreateOpen(false);

      if (createdTask) {
        setTasks((prev) => [createdTask, ...prev]);
      }

      await loadSummary();
    } catch (e) {
      setCreateError(e?.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  }

  const overdueCount = summary?.counts?.overdue ?? summary?.overdueTasks?.length ?? 0;
  const dueTodayCount = summary?.counts?.due_today ?? summary?.dueTodayTasks?.length ?? 0;
  const nextUpCount = summary?.counts?.next_7_days ?? summary?.nextUp?.length ?? 0;
  const taskTitle = (
    <div>
      {loadingTasks
        ? "Loading…"
        : tasks.length === 0
          ? "No tasks yet"
          : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
    </div>
  );

  return (
    <AppShell title="Tasks">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <ToggleFormSection
          title="Create Task"
          description="Quickly add a task tied to a lead or job without leaving the page."
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Task"
          closeLabel="Hide Form"
        >
          <TaskForm
            form={taskForm}
            onChange={setTaskForm}
            onSubmit={handleCreateTask}
            saving={creatingTask}
            error={createError}
            submitLabel="Create task"
            cancelLabel="Clear"
            onCancel={() => {
              setTaskForm(
                createEmptyTaskForm({
                  lead_id: prefillLeadId || "",
                  job_id: prefillJobId || "",
                }),
              );
              setContextType(prefillJobId ? "job" : "lead");
              setCreateError("");
            }}
            contextType={contextType}
            onContextChange={handleContextChange}
            leads={leads}
            jobs={jobs}
            loadingLeads={loadingLeads}
            loadingJobs={loadingJobs}
            isContextLocked={false}
            layout="compact"
          />
        </ToggleFormSection>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Overdue"
            value={loadingSummary ? "…" : String(overdueCount)}
            sub="Needs attention"
          />
          <SummaryCard
            label="Due Today"
            value={loadingSummary ? "…" : String(dueTodayCount)}
            sub="Due this day"
          />
          <SummaryCard
            label="Next Up"
            value={loadingSummary ? "…" : String(nextUpCount)}
            sub="Upcoming work"
          />
        </section>

        <section className="card rounded-lg p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:w-44">
              <label className="text-muted text-xs">Status</label>
              <select
                className="input mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="w-full lg:w-44">
              <label className="text-muted text-xs">Linked To</label>
              <select
                className="input mt-1"
                value={linkedFilter}
                onChange={(e) => setLinkedFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="job">Job</option>
                <option value="lead">Lead</option>
              </select>
            </div>

            <div className="w-full lg:w-36">
              <label className="text-muted text-xs">Lead ID</label>
              <input
                className="input mt-1"
                placeholder="e.g. 12"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="w-full lg:w-36">
              <label className="text-muted text-xs">Job ID</label>
              <input
                className="input mt-1"
                placeholder="e.g. 7"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="min-w-0 flex-1">
              <label className="text-muted text-xs">Title</label>
              <input
                className="input mt-1"
                placeholder="Filter by title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Link href="/tasks/new" className="btn">
                Full Form
              </Link>
              <button
                className="btn disabled:opacity-60"
                onClick={refreshAll}
                disabled={loadingSummary || loadingTasks || loadingLeads || loadingJobs}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <CollapsibleSection title={taskTitle} defaultOpen={true}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Linked To</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loadingTasks && tasks.length === 0 ? (
                  <tr className="border-base border-t">
                    <td className="text-muted px-4 py-6" colSpan={5}>
                      No tasks found. Try adjusting filters or create a new task.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-base hover:bg-accent border-t transition"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="block hover:opacity-80"
                        >
                          <div className="font-medium underline underline-offset-4">
                            {task.title}
                          </div>
                          {task.description ? (
                            <div className="text-muted mt-1 text-xs">
                              {task.description}
                            </div>
                          ) : null}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <LinkedEntityCell task={task} />
                      </td>

                      <td className="px-4 py-3">{formatDue(task.due_date)}</td>

                      <td className="px-4 py-3">
                        <TaskStatusBadge status={task.status} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="btn px-3 py-2 text-xs"
                          >
                            View
                          </Link>

                          <Link
                            href={`/tasks/${task.id}/edit`}
                            className="btn px-3 py-2 text-xs"
                          >
                            Edit
                          </Link>

                          {task.status === "Completed" ? (
                            <button
                              className="btn px-3 py-2 text-xs"
                              onClick={() => setTaskStatus(task.id, "Pending")}
                            >
                              Mark pending
                            </button>
                          ) : (
                            <button
                              className="btn px-3 py-2 text-xs"
                              onClick={() => setTaskStatus(task.id, "Completed")}
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
        </CollapsibleSection>
      </div>
    </AppShell>
  );
}
