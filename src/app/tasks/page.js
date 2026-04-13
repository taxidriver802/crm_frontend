"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { TaskForm, createEmptyTaskForm } from "@/components/forms/task-form";
import { api } from "@/lib/api";
import { formatDue, LinkedEntityCell } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { Skeleton, TableRowSkeleton } from "@/components/loading/loadingSkeletons";
import { TaskCalendar } from "@/components/calendar/task-calendar";
import { ListToolbar } from "@/components/list-toolbar";
import { SavedViewsControls } from "@/components/saved-views-controls";

function SummaryCard({ label, value, sub }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-muted text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );
}

function parseDuePresetFromSearch(searchParams) {
  const dp = searchParams.get("duePreset");
  if (dp === "overdue" || dp === "due_today" || dp === "next_7_days") {
    return dp;
  }
  if (searchParams.get("due") === "today") return "due_today";
  if (searchParams.get("due") === "overdue") return "overdue";
  if (searchParams.get("range") === "7") return "next_7_days";
  return "";
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

function TasksPageInner() {
  const router = useRouter();
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
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState("");

  const [contextType, setContextType] = useState(prefillJobId ? "job" : "lead");
  const [viewMode, setViewMode] = useState("list");
  const [calendarRange, setCalendarRange] = useState({ dateFrom: "", dateTo: "" });
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [taskForm, setTaskForm] = useState(
    createEmptyTaskForm({
      lead_id: prefillLeadId,
      job_id: prefillJobId,
    }),
  );

  const isInitialLoading = loadingSummary && loadingTasks;
  const canViewAll = currentUser?.role === "owner" || currentUser?.role === "admin";

  const duePreset = useMemo(() => parseDuePresetFromSearch(searchParams), [searchParams]);
  const currentFiltersForSave = useMemo(
    () => ({
      title,
      status,
      linkedFilter,
      leadId,
      jobId,
      assignedFilter,
      viewScope,
      viewMode,
      duePreset,
    }),
    [
      title,
      status,
      linkedFilter,
      leadId,
      jobId,
      assignedFilter,
      viewScope,
      viewMode,
      duePreset,
    ],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("tasks:view-mode");
    if (saved === "list" || saved === "calendar") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tasks:view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    let alive = true;
    async function loadMeAndTeam() {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json();
        if (!alive) return;
        const me = meData?.user || null;
        setCurrentUser(me);
        if (me?.role === "owner" || me?.role === "admin") {
          const usersRes = await api("/users");
          if (!alive) return;
          setTeamUsers(usersRes.users || []);
        }
      } catch {
        if (!alive) return;
        setCurrentUser(null);
        setTeamUsers([]);
      }
    }
    loadMeAndTeam();
    return () => {
      alive = false;
    };
  }, []);

  const handleCalendarRangeChange = useCallback((nextRange) => {
    setCalendarRange((prev) =>
      prev.dateFrom === nextRange.dateFrom && prev.dateTo === nextRange.dateTo
        ? prev
        : nextRange,
    );
  }, []);

  function replaceDuePresetInUrl(next) {
    const p = new URLSearchParams(searchParams.toString());
    if (next) {
      p.set("duePreset", next);
    } else {
      p.delete("duePreset");
    }
    p.delete("due");
    p.delete("range");
    const qs = p.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks");
  }

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

    if (canViewAll && viewScope === "all") {
      params.set("view", "all");
    }

    if (assignedFilter) {
      params.set("assignedTo", assignedFilter);
    }

    if (duePreset && viewMode !== "calendar") {
      params.set("duePreset", duePreset);
    }

    if (viewMode === "calendar" && calendarRange.dateFrom && calendarRange.dateTo) {
      params.set("dateFrom", calendarRange.dateFrom);
      params.set("dateTo", calendarRange.dateTo);
      params.set("limit", "200");
    } else {
      params.set("limit", "50");
    }
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [
    status,
    linkedFilter,
    leadId,
    jobId,
    title,
    duePreset,
    viewMode,
    calendarRange,
    canViewAll,
    viewScope,
    assignedFilter,
  ]);

  async function handleAssignTask(taskId, assignedTo) {
    const assignee = teamUsers.find((user) => user.id === assignedTo) || null;
    const previous = tasks;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assigned_to: assignedTo || null,
              assigned_user: assignee
                ? {
                    id: assignee.id,
                    first_name: assignee.first_name,
                    last_name: assignee.last_name,
                    email: assignee.email,
                  }
                : null,
            }
          : task,
      ),
    );

    try {
      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      });
    } catch (e) {
      setTasks(previous);
      setError(e?.message || "Failed to reassign task");
    }
  }

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

      if (viewMode === "calendar") {
        const unscheduledParams = new URLSearchParams();
        if (status && status !== "All") unscheduledParams.set("status", status);
        if (linkedFilter && linkedFilter !== "All")
          unscheduledParams.set("linkedTo", linkedFilter);
        if (leadId.trim()) unscheduledParams.set("leadId", leadId.trim());
        if (jobId.trim()) unscheduledParams.set("jobId", jobId.trim());
        if (title.trim()) unscheduledParams.set("q", title.trim());
        unscheduledParams.set("limit", "200");
        unscheduledParams.set("offset", "0");

        const allFiltered = await api(`/tasks?${unscheduledParams.toString()}`);
        const withoutDate = (allFiltered.tasks || []).filter((task) => !task.due_date);
        setUnscheduledCount(withoutDate.length);
      }
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
      {isInitialLoading ? (
        <div className="space-y-6">
          <div className="card space-y-3 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-[20rem]" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card space-y-2 px-4 py-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>

          <div className="card space-y-3 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="card space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : (
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
            <Link
              href="/tasks?duePreset=overdue"
              className="block rounded-lg transition hover:opacity-95"
            >
              <SummaryCard
                label="Overdue"
                value={loadingSummary ? "…" : String(overdueCount)}
                sub="Needs attention"
              />
            </Link>
            <Link
              href="/tasks?duePreset=due_today"
              className="block rounded-lg transition hover:opacity-95"
            >
              <SummaryCard
                label="Due Today"
                value={loadingSummary ? "…" : String(dueTodayCount)}
                sub="Due this day"
              />
            </Link>
            <Link
              href="/tasks?duePreset=next_7_days"
              className="block rounded-lg transition hover:opacity-95"
            >
              <SummaryCard
                label="Next Up"
                value={loadingSummary ? "…" : String(nextUpCount)}
                sub="Next 7 days"
              />
            </Link>
          </section>

          <section className="card rounded-lg p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:w-44">
                <label className="text-muted text-xs">Due window</label>
                <select
                  className="input mt-1"
                  value={duePreset}
                  onChange={(e) => replaceDuePresetInUrl(e.target.value)}
                >
                  <option value="">All tasks</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_today">Due today</option>
                  <option value="next_7_days">Next 7 days</option>
                </select>
              </div>

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

              <div className="w-full lg:w-44">
                <label className="text-muted text-xs">Assigned To</label>
                <select
                  className="input mt-1"
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                  {teamUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
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
            </div>
          </section>
          <ListToolbar
            left={
              <>
                {canViewAll ? (
                  <div className="border-base bg-surface flex items-center gap-1 rounded-md border p-1">
                    <button
                      type="button"
                      className={`btn px-2 py-1 text-xs ${
                        viewScope === "mine" ? "btn-primary" : "btn-ghost"
                      }`}
                      onClick={() => setViewScope("mine")}
                    >
                      My Tasks
                    </button>
                    <button
                      type="button"
                      className={`btn px-2 py-1 text-xs ${
                        viewScope === "all" ? "btn-primary" : "btn-ghost"
                      }`}
                      onClick={() => setViewScope("all")}
                    >
                      Team
                    </button>
                  </div>
                ) : null}

                <div className="border-base bg-surface flex items-center gap-1 rounded-md border p-1">
                  <button
                    type="button"
                    className={`btn px-2 py-1 text-xs ${
                      viewMode === "list" ? "btn-primary" : "btn-ghost"
                    }`}
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={`btn px-2 py-1 text-xs ${
                      viewMode === "calendar" ? "btn-primary" : "btn-ghost"
                    }`}
                    onClick={() => setViewMode("calendar")}
                  >
                    Calendar
                  </button>
                </div>
              </>
            }
            right={
              <SavedViewsControls
                entityType="tasks"
                currentFilters={currentFiltersForSave}
                onApplyFilters={(filters) => {
                  setTitle(String(filters?.title || ""));
                  setStatus(String(filters?.status || ""));
                  setLinkedFilter(String(filters?.linkedFilter || ""));
                  setLeadId(String(filters?.leadId || ""));
                  setJobId(String(filters?.jobId || ""));
                  setAssignedFilter(String(filters?.assignedFilter || ""));
                  setViewScope(String(filters?.viewScope || "mine"));
                  setViewMode(
                    filters?.viewMode === "calendar" || filters?.viewMode === "list"
                      ? filters.viewMode
                      : "list",
                  );
                  replaceDuePresetInUrl(String(filters?.duePreset || ""));
                }}
              />
            }
          />

          <CollapsibleSection
            title={taskTitle}
            defaultOpen={true}
            actions={
              <>
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
              </>
            }
          >
            {viewMode === "calendar" ? (
              <div className="space-y-3">
                <div className="text-muted text-xs">
                  {unscheduledCount > 0
                    ? `${unscheduledCount} task${unscheduledCount === 1 ? "" : "s"} without a due date are not shown on calendar.`
                    : "All visible tasks have due dates."}
                </div>
                <TaskCalendar
                  tasks={tasks}
                  onRangeChange={handleCalendarRangeChange}
                  onTaskClick={(task) => router.push(`/tasks/${task.id}`)}
                  onDayCreate={(day) => {
                    const yyyy = day.getFullYear();
                    const mm = String(day.getMonth() + 1).padStart(2, "0");
                    const dd = String(day.getDate()).padStart(2, "0");
                    setTaskForm((prev) => ({
                      ...prev,
                      due_date: `${yyyy}-${mm}-${dd}T09:00`,
                    }));
                    setIsCreateOpen(true);
                  }}
                />
              </div>
            ) : (
              <div className="scrollbar-theme overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-accent">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Linked To</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Assignee</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!isInitialLoading && loadingTasks ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRowSkeleton key={i} cols={6} />
                      ))
                    ) : tasks.length === 0 ? (
                      <tr className="border-base border-t">
                        <td className="text-muted px-4 py-6" colSpan={6}>
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
                              <div
                                className="truncate font-medium underline underline-offset-4"
                                style={{ maxWidth: 240, display: "block" }}
                                title={task.title}
                              >
                                {task.title}
                              </div>
                              {task.description ? (
                                <div
                                  className="text-muted mt-1 truncate text-xs"
                                  style={{ maxWidth: 240, display: "block" }}
                                  title={task.description}
                                >
                                  {task.description}
                                </div>
                              ) : null}
                            </Link>
                          </td>

                          <td className="truncate px-4 py-3">
                            <LinkedEntityCell task={task} />
                          </td>

                          <td className="truncate px-4 py-3">
                            {formatDue(task.due_date)}
                          </td>

                          <td className="truncate px-4 py-3">
                            <TaskStatusBadge status={task.status} />
                          </td>

                          <td className="truncate px-4 py-3">
                            {canViewAll ? (
                              <select
                                className="input"
                                value={task.assigned_to || ""}
                                onChange={(e) =>
                                  handleAssignTask(task.id, e.target.value)
                                }
                              >
                                <option value="">Unassigned</option>
                                {teamUsers.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name}
                                  </option>
                                ))}
                              </select>
                            ) : task.assigned_user ? (
                              `${task.assigned_user.first_name || ""} ${task.assigned_user.last_name || ""}`.trim() ||
                              task.assigned_user.email
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          <td className="truncate px-4 py-3 text-right">
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
            )}
          </CollapsibleSection>
        </div>
      )}
    </AppShell>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Tasks">
          <div className="text-muted p-4 text-sm">Loading…</div>
        </AppShell>
      }
    >
      <TasksPageInner />
    </Suspense>
  );
}
