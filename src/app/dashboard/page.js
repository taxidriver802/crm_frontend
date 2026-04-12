"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { formatDue } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ActivityList } from "@/components/activity-list";

import LoadingDots, {
  Skeleton,
  SectionSkeleton,
  StatCardSkeleton,
} from "@/components/loading/loadingSkeletons";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function StatCard({ label, value, sub, href }) {
  const inner = (
    <div className="card hover:bg-accent h-full rounded-lg p-3 transition-colors sm:p-4">
      <div className="text-muted text-xs sm:text-sm">{label}</div>
      <div className="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">{value}</div>
      {sub ? <div className="text-muted mt-1 hidden text-xs sm:block">{sub}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function SectionCard({ title, right, children, className = "" }) {
  return (
    <section className={cx("card rounded-lg", className)}>
      <div className="border-base flex items-center justify-between gap-3 border-b p-4">
        <div className="text-sm font-medium">{title}</div>
        {right ? <div className="text-sm">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Badge({ children }) {
  return <span className="status-chip">{children}</span>;
}

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

  const isInitialLoading = loading && !data;

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

    const estByStatus = Array.isArray(data.estimates?.byStatus) ? data.estimates.byStatus : [];
    const totalEstimates = data.estimates?.total ?? 0;
    const draftEst = estByStatus.find((s) => s.status === "Draft")?.count ?? 0;
    const sentEst = estByStatus.find((s) => s.status === "Sent")?.count ?? 0;

    const counts = data.tasks?.counts || {};
    const overdue = counts.overdue ?? 0;
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
        label: "Due Today",
        value: String(dueToday),
        sub: `${overdue} overdue`,
        href: "/tasks?due=today",
      },
      {
        label: "Next 7 Days",
        value: String(next7),
        sub: "Upcoming tasks",
        href: "/tasks?range=7",
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
      <Link className="hover:underline" href="/leads">
        All leads
      </Link>
    ) : (
      <Link className="text-muted hover:underline" href="/leads">
        No leads yet
      </Link>
    );

  const jobsByStatusTitle =
    jobStatusSummary.length > 0 ? (
      <Link className="hover:underline" href="/jobs">
        All jobs
      </Link>
    ) : (
      <Link className="text-muted hover:underline" href="/jobs">
        No jobs yet
      </Link>
    );

  const estimatesByStatusTitle = (
    <Link className="hover:underline" href="/jobs">
      By status
    </Link>
  );

  const taskTitle = (
    <div className="flex gap-5">
      <Link className="hover:underline" href="/tasks">
        Tasks
      </Link>
    </div>
  );

  function TaskRow({ t }) {
    const leadName = getTaskLeadLabel(t);
    const jobLabel = getTaskJobLabel(t);
    const jobPart = t.job?.id ? (
      <Link
        href={`/jobs/${t.job.id}`}
        className="hover:text-main font-medium underline-offset-2 hover:underline"
      >
        {t.job?.title || jobLabel}
      </Link>
    ) : jobLabel ? (
      <span>{jobLabel}</span>
    ) : null;

    return (
      <div className="border-base hover:bg-accent rounded-lg border p-3 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium">{t.title}</div>
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
              className="btn px-3 py-2 text-xs"
              onClick={() => setTaskStatus(t.id, "Pending")}
            >
              Mark pending
            </button>
          ) : (
            <button
              className="btn px-3 py-2 text-xs"
              onClick={() => setTaskStatus(t.id, "Completed")}
            >
              Mark completed
            </button>
          )}
        </div>
      </div>
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
      api("/dashboard"),
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
        await refreshDashboardSections({ initial: true, refreshActivity: true });
      } finally {
        if (!alive) return;
      }
    }

    loadDashboard();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell
      title="Dashboard"
      right={
        <div className="flex items-center gap-2 text-sm">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {isInitialLoading
            ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {!loading && err ? (
          <div className="card rounded-lg p-4">
            <div className="text-sm font-medium">Couldn&apos;t load dashboard</div>
            <div className="text-muted mt-1 text-sm">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            <CollapsibleSection title={taskTitle} defaultOpen={true}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    className={cx(
                      "btn px-3 py-2 text-xs",
                      tab === "overdue" && "bg-accent text-main",
                    )}
                    onClick={() => setTab("overdue")}
                  >
                    Overdue
                  </button>

                  <button
                    className={cx(
                      "btn px-3 py-2 text-xs",
                      tab === "due_today" && "bg-accent text-main",
                    )}
                    onClick={() => setTab("due_today")}
                  >
                    Due Today
                  </button>

                  <button
                    className={cx(
                      "btn px-3 py-2 text-xs",
                      tab === "next_up" && "bg-accent text-main",
                    )}
                    onClick={() => setTab("next_up")}
                  >
                    Next Up
                  </button>
                </div>
                <Link className="text-muted hover:underline" href="/tasks">
                  View all
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {isInitialLoading ? (
                  <SectionSkeleton rows={3} />
                ) : currentTasks.length === 0 ? (
                  <div className="text-muted text-sm">Nothing here 🎉</div>
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
            <CollapsibleSection title={recentTitle} defaultOpen={true}>
              {loadingActivity ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : activity.length === 0 ? (
                <div className="space-y-3">
                  <div className="text-muted text-sm">No recent activity</div>
                </div>
              ) : (
                <ActivityList
                  activity={activity}
                  loading={loadingActivity}
                  maxPerGroup={2}
                />
              )}
            </CollapsibleSection>

            <CollapsibleSection title={jobsByStatusTitle} defaultOpen={true}>
              {isInitialLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-base rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : jobStatusSummary.length === 0 ? (
                <div className="text-muted text-sm">No jobs yet</div>
              ) : (
                <div className="space-y-2">
                  {jobStatusSummary.map((row) => (
                    <Link
                      key={row.status}
                      className="border-base hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition"
                      href={`/jobs?status=${encodeURIComponent(row.status)}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{row.status}</Badge>
                      </div>
                      <div className="text-sm font-semibold">{row.count}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title={estimatesByStatusTitle} defaultOpen={true}>
              {isInitialLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-base rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : estimateStatusSummary.length === 0 ? (
                <div className="text-muted text-sm">No estimates yet</div>
              ) : (
                <div className="space-y-2">
                  {estimateStatusSummary.map((row) => (
                    <div
                      key={row.status}
                      className="border-base flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{row.status}</Badge>
                      </div>
                      <div className="text-sm font-semibold">{row.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title={leadTitle} defaultOpen={true}>
              {isInitialLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-base rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : statusSummary.length === 0 ? (
                <div className="text-muted text-sm">No leads yet</div>
              ) : (
                <div className="space-y-2">
                  {statusSummary.map((row) => (
                    <Link
                      key={row.status}
                      className="border-base hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition"
                      href={`/leads?status=${row.status}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{row.status}</Badge>
                      </div>
                      <div className="text-sm font-semibold">{row.count}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
