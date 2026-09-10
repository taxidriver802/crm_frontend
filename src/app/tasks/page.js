"use client";

import { Alert } from "@/components/ui/alert";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { TaskForm, createEmptyTaskForm, buildTaskApiPayload } from "@/components/forms/task-form";
import { api } from "@/lib/api";
import { TaskCalendar } from "@/components/calendar/task-calendar";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { AttentionStrip } from "@/components/dashboard/attention-strip";
import { PageToolbar } from "@/components/page-toolbar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { TasksList } from "@/components/lists/tasks-list";
import { useScrollIntoViewOnChange } from "@/lib/use-scroll-into-view-on-change";

/** 12rem — matches `min-w-[12rem]` menus */
const TABLE_DROPDOWN_MENU_WIDTH_PX = 192;
const TABLE_DROPDOWN_MENU_GAP_PX = 4;

function getTableDropdownMenuPosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  let left = rect.right - TABLE_DROPDOWN_MENU_WIDTH_PX;
  const pad = 8;
  left = Math.max(
    pad,
    Math.min(left, window.innerWidth - TABLE_DROPDOWN_MENU_WIDTH_PX - pad),
  );
  return {
    top: rect.bottom + TABLE_DROPDOWN_MENU_GAP_PX,
    left,
    width: TABLE_DROPDOWN_MENU_WIDTH_PX,
  };
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

function TasksPageInner() {
  const router = useRouter();
  const push = useReturnPush();
  const searchParams = useSearchParams();

  const prefillLeadId = searchParams.get("lead_id") || "";
  const prefillJobId = searchParams.get("job_id") || "";
  const shouldOpenCreate = searchParams.get("open") === "create";
  const assignedParam = searchParams.get("assignedTo") || "";
  const statusParam = searchParams.get("status") || "";

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(() => statusParam);
  const [linkedFilter, setLinkedFilter] = useState("");
  const [leadId, setLeadId] = useState("");
  const [jobId, setJobId] = useState("");

  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState(() => assignedParam);

  const [contextType, setContextType] = useState(prefillJobId ? "job" : "lead");
  const [viewMode, setViewMode] = useState("list");
  const [calendarRange, setCalendarRange] = useState({ dateFrom: "", dateTo: "" });
  const [viewFocusToken, setViewFocusToken] = useState(0);
  const viewContentRef = useScrollIntoViewOnChange(viewFocusToken);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [openActionsTaskId, setOpenActionsTaskId] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);
  const [taskForm, setTaskForm] = useState(
    createEmptyTaskForm({
      lead_id: prefillLeadId,
      job_id: prefillJobId,
    }),
  );

  const canViewAll = currentUser?.role === "owner" || currentUser?.role === "admin";
  const duePreset = useMemo(() => parseDuePresetFromSearch(searchParams), [searchParams]);
  const summaryPath =
    canViewAll && viewScope === "all" ? "/tasks/summary?view=all" : "/tasks/summary";
  const newTaskHref = prefillJobId
    ? `/tasks/new?job_id=${prefillJobId}`
    : prefillLeadId
      ? `/tasks/new?lead_id=${prefillLeadId}`
      : "/tasks/new";

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
    setAssignedFilter(assignedParam);
  }, [assignedParam]);

  useEffect(() => {
    setStatus(statusParam);
  }, [statusParam]);

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
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
  }

  function handleMetricFocus(id) {
    replaceDuePresetInUrl(id === "all" ? "" : id);
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
      const data = await api(summaryPath);
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
        if (canViewAll && viewScope === "all") unscheduledParams.set("view", "all");
        if (assignedFilter) unscheduledParams.set("assignedTo", assignedFilter);
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
    await Promise.all([
      loadSummary(),
      loadTasks(),
      isCreateOpen ? Promise.all([loadLeads(), loadJobs()]) : Promise.resolve(),
    ]);
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryPath]);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!isCreateOpen) return;
    loadLeads();
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateOpen]);

  function syncActionsMenuPosition(taskId) {
    if (taskId == null) {
      setActionsMenuPosition(null);
      return;
    }
    const el = document.querySelector(`[data-task-actions-menu="${taskId}"]`);
    if (el) {
      setActionsMenuPosition(getTableDropdownMenuPosition(el));
    }
  }

  useLayoutEffect(() => {
    syncActionsMenuPosition(openActionsTaskId);
  }, [openActionsTaskId]);

  useEffect(() => {
    if (openActionsTaskId == null) return undefined;

    function handlePointerDown(e) {
      if (e.target.closest("[data-task-actions-menu]")) return;
      setOpenActionsTaskId(null);
      setActionsMenuPosition(null);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpenActionsTaskId(null);
        setActionsMenuPosition(null);
      }
    }

    function handleReposition() {
      syncActionsMenuPosition(openActionsTaskId);
    }

    window.addEventListener("resize", handleReposition);
    document.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionsTaskId]);

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

    if (taskForm.kind === "appointment" && !taskForm.due_date) {
      setCreateError("Appointments require a start time.");
      return;
    }

    const payload = buildTaskApiPayload(taskForm, { contextType });

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

  const overdueCount = summary?.counts?.overdue ?? 0;
  const dueTodayCount = summary?.counts?.due_today ?? 0;
  const nextUpCount = summary?.counts?.next_7_days ?? 0;

  const metrics = [
    {
      id: "overdue",
      label: "Overdue",
      value: String(overdueCount),
      sub: overdueCount ? "Needs you now" : "Nothing overdue",
      tone: overdueCount > 0 ? "danger" : "neutral",
    },
    {
      id: "due_today",
      label: "Due today",
      value: String(dueTodayCount),
      sub: "Follow-ups for today",
    },
    {
      id: "next_7_days",
      label: "Next 7 days",
      value: String(nextUpCount),
      sub: "Upcoming tasks",
    },
  ];

  const statusOptions = [
    { value: "", label: "All" },
    { value: "Pending", label: "Pending", short: "Open" },
    { value: "Completed", label: "Completed", short: "Done" },
  ];

  return (
    <AppShell
      title="Tasks"
      description={
        loadingTasks ? "Loading…" : `${tasks.length} in this view`
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll ? (
            <Segmented
              aria-label="Task scope"
              value={viewScope}
              onChange={setViewScope}
              options={[
                { value: "mine", label: "Mine", short: "Mine" },
                { value: "all", label: "Team", short: "Team" },
              ]}
            />
          ) : null}
          <Segmented
            aria-label="Task layout"
            value={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setViewFocusToken((token) => token + 1);
            }}
            options={[
              { value: "list", label: "List" },
              { value: "calendar", label: "Calendar", short: "Cal" },
            ]}
          />
        </div>
      }
    >
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        {isCreateOpen ? (
          <section className="card p-4">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">New task</div>
                <p className="text-muted mt-0.5 text-xs">
                  Add a follow-up tied to a lead or job.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={newTaskHref} className="btn btn-sm">
                  Full form
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creatingTask}
                >
                  Hide
                </button>
              </div>
            </div>
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
          </section>
        ) : null}

        <AttentionStrip
          metrics={metrics}
          focus={duePreset || "all"}
          onFocus={handleMetricFocus}
          loading={loadingSummary && !summary}
        />

        <Segmented
          className="w-full min-w-0"
          aria-label="Task status"
          value={status}
          onChange={setStatus}
          options={statusOptions}
        />

        <PageToolbar
          search={
            <input
              className="input min-w-0 w-full flex-1 basis-48"
              placeholder="Search title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          }
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={refreshAll}
              disabled={loadingSummary || loadingTasks}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
          create={
            isCreateOpen ? null : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateOpen(true)}
                disabled={creatingTask}
              >
                New task
              </button>
            )
          }
          savedViews={
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
        >
          <select
            className="input min-w-0 w-full sm:w-40"
            value={linkedFilter}
            onChange={(e) => setLinkedFilter(e.target.value)}
            aria-label="Linked to"
          >
            <option value="">Any link</option>
            <option value="job">Job</option>
            <option value="lead">Lead</option>
          </select>
          <select
            className="input min-w-0 w-full sm:w-48"
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            aria-label="Assigned to"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {teamUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </PageToolbar>

        <div
          ref={viewContentRef}
          id="tasks-view"
          className="scroll-mt-20"
        >
          {viewMode === "calendar" ? (
            <div className="space-y-3">
              {duePreset ? (
                <p className="text-muted text-xs">
                  Due window is saved for List. Calendar shows the visible month
                  instead.
                </p>
              ) : null}
              <p className="text-muted text-xs">
                {unscheduledCount > 0
                  ? `${unscheduledCount} task${unscheduledCount === 1 ? "" : "s"} without a due date are not shown on calendar.`
                  : "All visible tasks have due dates."}
              </p>
              <TaskCalendar
                tasks={tasks}
                onRangeChange={handleCalendarRangeChange}
                onTaskClick={(task) => push(`/tasks/${task.id}`)}
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
            <TasksList
              layout="flush"
              tasks={tasks}
              loading={loadingTasks}
              canViewAll={canViewAll}
              teamUsers={teamUsers}
              onOpen={(taskId) => push(`/tasks/${taskId}`)}
              onAssign={handleAssignTask}
              openActionsTaskId={openActionsTaskId}
              actionsMenuPosition={actionsMenuPosition}
              onToggleActions={(taskId, triggerEl) => {
                if (openActionsTaskId === taskId) {
                  setOpenActionsTaskId(null);
                  setActionsMenuPosition(null);
                  return;
                }
                const wrap = triggerEl.closest("[data-task-actions-menu]");
                if (wrap) {
                  setActionsMenuPosition(getTableDropdownMenuPosition(wrap));
                }
                setOpenActionsTaskId(taskId);
              }}
              onCloseActions={() => {
                setOpenActionsTaskId(null);
                setActionsMenuPosition(null);
              }}
              onSetStatus={setTaskStatus}
            />
          )}
        </div>
      </div>
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
