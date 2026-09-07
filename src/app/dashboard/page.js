"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { formatDue } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ActivityList } from "@/components/activity-list";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageError, EmptyState } from "@/components/error-boundary";
import { Segmented } from "@/components/ui/segmented";
import { ListRow } from "@/components/ui/list-row";
import { Icon } from "@/components/icons";
import { ActionQueue } from "@/components/dashboard/action-queue";
import { ReturnLink } from "@/components/return-to";

import LoadingDots, {
  Skeleton,
  SectionSkeleton,
  StatCardSkeleton,
} from "@/components/loading/loadingSkeletons";

function getTaskLeadLabel(task) {
  if (task.lead_first_name && task.lead_last_name) {
    return `${task.lead_first_name} ${task.lead_last_name}`;
  }

  if (task.lead_id) {
    return `Lead #${task.lead_id}`;
  }

  return null;
}

function getTaskJobLabel(task) {
  if (task.job?.title) return task.job.title;
  if (task.job_id) return `Job #${task.job_id}`;
  return null;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("due_today");
  const [viewScope, setViewScope] = useState("mine");

  const isInitialLoading = loading && !data;
  const canViewAll = user?.role === "owner" || user?.role === "admin";
  const dashboardPath =
    canViewAll && viewScope === "all" ? "/dashboard?view=all" : "/dashboard";

  const stats = useMemo(() => {
    if (!data?.ok) return [];

    const totalLeads = data.leads?.total ?? 0;
    const leadByStatus = Array.isArray(data.leads?.byStatus) ? data.leads.byStatus : [];
    const newCount = leadByStatus.find((s) => s.status === "New")?.count ?? 0;

    const jobByStatus = Array.isArray(data.jobs?.byStatus) ? data.jobs.byStatus : [];
    const closedJob = new Set(["Closed Won", "Closed Lost"]);
    const openJobs = jobByStatus
      .filter((r) => !closedJob.has(r.status))
      .reduce((sum, r) => sum + (r.count ?? 0), 0);

    const totalJobs = data.jobs?.total ?? 0;

    const estByStatus = Array.isArray(data.estimates?.byStatus)
      ? data.estimates.byStatus
      : [];
    const totalEstimates = data.estimates?.total ?? 0;
    const draftEst = estByStatus.find((s) => s.status === "Draft")?.count ?? 0;
    const sentEst = estByStatus.find((s) => s.status === "Sent")?.count ?? 0;

    const counts = data.tasks?.counts || {};
    const overdue = counts.overdue ?? 0;
    const overdueOnJobs = counts.overdue_on_jobs ?? 0;
    const dueToday = counts.due_today ?? 0;
    const next7 = counts.next_7_days ?? 0;

    return [
      {
        label: "Jobs",
        value: String(totalJobs),
        sub: `${openJobs} open`,
        href: "/jobs",
      },
      {
        label: "Estimates",
        value: String(totalEstimates),
        sub: `${draftEst} draft · ${sentEst} sent`,
        href: "/jobs",
      },
      {
        label: "Overdue",
        value: String(overdue),
        sub: `${overdueOnJobs} on jobs`,
        href: "/tasks?duePreset=overdue",
      },
      {
        label: "Due Today",
        value: String(dueToday),
        sub: "Due this calendar day",
        href: "/tasks?duePreset=due_today",
      },
      {
        label: "Next 7 Days",
        value: String(next7),
        sub: "Upcoming tasks",
        href: "/tasks?duePreset=next_7_days",
      },
      {
        label: "Total Leads",
        value: String(totalLeads),
        sub: `${newCount} new`,
        href: "/leads",
      },
      {
        label: "New Leads",
        value: String(newCount),
        sub: "Status = New",
        href: "/leads?status=New",
      },
    ];
  }, [data]);

  const currentTasks = useMemo(() => {
    if (!data?.ok) return [];

    const taskData = data.tasks || {};

    if (tab === "overdue") return taskData.overdueTasks || [];
    if (tab === "due_today") return taskData.dueTodayTasks || [];
    return taskData.nextUp || [];
  }, [data, tab]);

  const taskCounts = useMemo(() => {
    const counts = data?.tasks?.counts || {};
    return {
      overdue: counts.overdue ?? 0,
      dueToday: counts.due_today ?? 0,
      nextUp: counts.next_7_days ?? 0,
    };
  }, [data]);

  const dashboardTasksEmpty = useMemo(() => {
    if (!data?.ok) return true;
    const taskData = data.tasks || {};
    return (
      !(taskData.overdueTasks?.length) &&
      !(taskData.dueTodayTasks?.length) &&
      !(taskData.nextUp?.length)
    );
  }, [data]);

  const statusSummary = useMemo(() => {
    return Array.isArray(data?.leads?.byStatus) ? data.leads.byStatus : [];
  }, [data]);

  const jobStatusSummary = useMemo(() => {
    return Array.isArray(data?.jobs?.byStatus) ? data.jobs.byStatus : [];
  }, [data]);

  const estimateStatusSummary = useMemo(() => {
    return Array.isArray(data?.estimates?.byStatus) ? data.estimates.byStatus : [];
  }, [data]);

  const greeting = user?.first_name ? `Welcome back, ${user.first_name}` : "Welcome back";
  const recentTitle =
    activity.length > 0 ? (
      <div className="flex gap-5">
        <span>Recent activity</span>
      </div>
    ) : (
      <span>No recent activity</span>
    );
  const leadTitle =
    statusSummary.length > 0 ? (
      <ReturnLink className="hover:underline" href="/leads">
        All leads
      </ReturnLink>
    ) : (
      <ReturnLink className="text-muted hover:underline" href="/leads">
        No leads yet
      </ReturnLink>
    );

  const jobsByStatusTitle =
    jobStatusSummary.length > 0 ? (
      <ReturnLink className="hover:underline" href="/jobs">
        All jobs
      </ReturnLink>
    ) : (
      <ReturnLink className="text-muted hover:underline" href="/jobs">
        No jobs yet
      </ReturnLink>
    );

  const estimatesByStatusTitle = (
    <ReturnLink className="hover:underline" href="/jobs">
      By status
    </ReturnLink>
  );

  const taskTitle = (
    <div className="flex gap-5">
      <ReturnLink className="hover:underline" href="/tasks">
        Tasks
      </ReturnLink>
    </div>
  );

  function TaskRow({ t }) {
    const leadName = getTaskLeadLabel(t);
    const jobLabel = getTaskJobLabel(t);
    const jobPart = t.job?.id ? (
      <ReturnLink
        href={`/jobs/${t.job.id}`}
        className="hover:text-main font-medium underline-offset-2 hover:underline"
      >
        {t.job?.title || jobLabel}
      </ReturnLink>
    ) : jobLabel ? (
      <span>{jobLabel}</span>
    ) : null;

    return (
      <ListRow className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ReturnLink
            href={`/tasks/${t.id}`}
            className="hover:text-main font-medium hover:underline"
          >
            {t.title}
          </ReturnLink>
          <div className="text-muted mt-1 flex flex-wrap items-center gap-x-1 text-sm">
            {leadName ? <span>{leadName}</span> : null}
            {leadName && jobPart ? <span>·</span> : null}
            {jobPart}
            {leadName || jobPart ? <span>·</span> : null}
            <span>{formatDue(t.due_date)}</span>
          </div>
        </div>

        {t.status === "Completed" ? (
          <button
            className="btn btn-sm"
            onClick={() => setTaskStatus(t.id, "Pending")}
          >
            Mark pending
          </button>
        ) : (
          <button
            className="btn btn-sm"
            onClick={() => setTaskStatus(t.id, "Completed")}
          >
            Mark completed
          </button>
        )}
      </ListRow>
    );
  }

  async function refreshDashboardSections({
    initial = false,
    refreshActivity = true,
  } = {}) {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshingDashboard(true);
    }

    if (refreshActivity) {
      setLoadingActivity(true);
    }

    setErr("");

    const requests = [
      api(dashboardPath),
      api("/auth/me", { credentials: "include" }),
      refreshActivity ? api("/dashboard/activities") : Promise.resolve(null),
    ];

    const [dashboardRes, authRes, activityRes] = await Promise.allSettled(requests);

    if (dashboardRes.status === "fulfilled") {
      setData(dashboardRes.value);
    } else {
      setErr(dashboardRes.reason?.message || "Failed to load dashboard");
    }

    if (authRes.status === "fulfilled") {
      setUser(authRes.value?.user || null);
    } else {
      setUser(null);
    }

    if (refreshActivity) {
      if (activityRes.status === "fulfilled") {
        setActivity(activityRes.value?.activity || []);
      } else {
        setActivity([]);
      }
    }

    if (initial) {
      setLoading(false);
    } else {
      setRefreshingDashboard(false);
    }

    if (refreshActivity) {
      setLoadingActivity(false);
    }
  }

  async function setTaskStatus(taskId, nextStatus) {
    try {
      setErr("");

      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      await refreshDashboardSections({ initial: false, refreshActivity: true });
    } catch (e) {
      setErr(e.message || "Failed to update task");
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        await refreshDashboardSections({
          initial: !data,
          refreshActivity: true,
        });
      } finally {
        if (!alive) return;
      }
    }

    loadDashboard();

    return () => {
      alive = false;
    };
  }, [viewScope]);

  return (
    <AppShell
      title="Dashboard"
      right={
        <div className="flex items-center gap-3 text-sm">
          {canViewAll ? (
            <Segmented
              aria-label="Dashboard scope"
              value={viewScope}
              onChange={setViewScope}
              options={[
                { value: "mine", label: "Mine", short: "Mine" },
                { value: "all", label: "Team", short: "Team" },
              ]}
            />
          ) : null}
          {refreshingDashboard ? (
            <div className="pr-2">
              <LoadingDots />
            </div>
          ) : (
            <span className="text-muted">{greeting}</span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {isInitialLoading
            ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((s) => <StatCard key={s.label} size="compact" {...s} />)}
        </div>

        {!loading && err ? <PageError message={err} /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            <ActionQueue
              title="Start here"
              items={data?.actions?.startHere}
              loading={isInitialLoading}
              hideWhenEmpty={false}
              emptyTitle="You're caught up"
              collapsible
            />

            <CollapsibleSection
              title={taskTitle}
              ready={!isInitialLoading}
              empty={dashboardTasksEmpty}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Segmented
                  aria-label="Task window"
                  value={tab}
                  onChange={setTab}
                  options={[
                    {
                      value: "overdue",
                      label: "Overdue",
                      short: "OD",
                      count: taskCounts.overdue,
                      countTone: taskCounts.overdue > 0 ? "danger" : undefined,
                    },
                    {
                      value: "due_today",
                      label: "Due Today",
                      short: "Today",
                      count: taskCounts.dueToday,
                      countTone: taskCounts.dueToday > 0 ? "warning" : undefined,
                    },
                    {
                      value: "next_up",
                      label: "Next Up",
                      short: "Next",
                      count: taskCounts.nextUp,
                    },
                  ]}
                />

                <ReturnLink
                  className="text-muted text-xs hover:underline"
                  href={
                    tab === "overdue"
                      ? "/tasks?duePreset=overdue"
                      : tab === "due_today"
                        ? "/tasks?duePreset=due_today"
                        : "/tasks?duePreset=next_7_days"
                  }
                >
                  Open in Tasks
                </ReturnLink>
              </div>

              <div className="space-y-2">
                {isInitialLoading ? (
                  <SectionSkeleton rows={3} />
                ) : currentTasks.length === 0 ? (
                  <EmptyState
                    icon={<Icon name="inbox" className="h-5 w-5" />}
                    title="Nothing here"
                    description="No tasks in this window."
                  />
                ) : (
                  currentTasks.map((t) => <TaskRow key={t.id} t={t} />)
                )}
              </div>
            </CollapsibleSection>
          </div>

          <div className="space-y-4">
            <SectionCard title="Quick actions">
              <div className="flex flex-wrap gap-2">
                <Link href="/leads/new" className="btn">
                  New Lead
                </Link>
                <Link href="/tasks/new" className="btn">
                  New Task
                </Link>
              </div>
            </SectionCard>

            <ActionQueue
              title="Estimates awaiting"
              items={data?.actions?.estimatesAwaiting}
              loading={isInitialLoading}
              href="/jobs"
              collapsible
            />
            <ActionQueue
              title="Invoices due"
              items={data?.actions?.invoicesDue}
              loading={isInitialLoading}
              href="/invoices?due=this_week"
              collapsible
            />
            <ActionQueue
              title="Stale leads"
              items={data?.actions?.staleLeads}
              loading={isInitialLoading}
              href="/leads"
              collapsible
            />
            <ActionQueue
              title="Blocked jobs"
              items={data?.actions?.blockedJobs}
              loading={isInitialLoading}
              href="/jobs"
              collapsible
            />

            <CollapsibleSection
              title={recentTitle}
              ready={!loadingActivity}
              empty={activity.length === 0}
            >
              {loadingActivity ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : activity.length === 0 ? (
                <EmptyState title="No recent activity" />
              ) : (
                <ActivityList
                  activity={activity}
                  loading={loadingActivity}
                  maxPerGroup={2}
                />
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="By status"
              ready={!isInitialLoading}
              empty={
                jobStatusSummary.length === 0 &&
                estimateStatusSummary.length === 0 &&
                statusSummary.length === 0
              }
              defaultOpen={false}
            >
              <div className="space-y-4">
                <div>
                  <div className="text-muted mb-2 text-xs font-medium">{jobsByStatusTitle}</div>
                  {jobStatusSummary.map((row) => (
                    <ListRow
                      key={row.status}
                      href={`/jobs?status=${encodeURIComponent(row.status)}`}
                      className="flex items-center justify-between"
                    >
                      <StatusBadge kind="job" status={row.status} />
                      <div className="text-sm font-semibold">{row.count}</div>
                    </ListRow>
                  ))}
                </div>
                <div>
                  <div className="text-muted mb-2 text-xs font-medium">{estimatesByStatusTitle}</div>
                  {estimateStatusSummary.map((row) => (
                    <ListRow
                      key={row.status}
                      className="flex items-center justify-between"
                    >
                      <StatusBadge kind="estimate" status={row.status} />
                      <div className="text-sm font-semibold">{row.count}</div>
                    </ListRow>
                  ))}
                </div>
                <div>
                  <div className="text-muted mb-2 text-xs font-medium">{leadTitle}</div>
                  {statusSummary.map((row) => (
                    <ListRow
                      key={row.status}
                      href={`/leads?status=${row.status}`}
                      className="flex items-center justify-between"
                    >
                      <StatusBadge kind="lead" status={row.status} />
                      <div className="text-sm font-semibold">{row.count}</div>
                    </ListRow>
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
