"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError } from "@/components/error-boundary";
import { Segmented } from "@/components/ui/segmented";
import { AttentionStrip } from "@/components/dashboard/attention-strip";
import { WorkQueue } from "@/components/dashboard/work-queue";
import { ContextRail } from "@/components/dashboard/context-rail";
import {
  actionKey,
  greetingFor,
  isOverdueItem,
  mergeActions,
  todayLabel,
} from "@/components/dashboard/queue";
import LoadingDots from "@/components/loading/loadingSkeletons";

function taskToItem(task, reason) {
  if (!task?.id) return null;

  const leadName =
    task.lead_first_name && task.lead_last_name
      ? `${task.lead_first_name} ${task.lead_last_name}`
      : task.lead_id
        ? `Lead #${task.lead_id}`
        : null;
  const jobLabel = task.job?.title || (task.job_id ? `Job #${task.job_id}` : null);

  return {
    kind: "task",
    id: task.id,
    title: task.title,
    subtitle: [leadName, jobLabel].filter(Boolean).join(" · ") || null,
    href: `/tasks/${task.id}`,
    reason,
    at: task.due_date || null,
  };
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [err, setErr] = useState("");
  const [viewScope, setViewScope] = useState("mine");
  const [filter, setFilter] = useState("all");
  const [completingId, setCompletingId] = useState(null);

  const isInitialLoading = loading && !data;
  const canViewAll = user?.role === "owner" || user?.role === "admin";
  const dashboardPath =
    canViewAll && viewScope === "all" ? "/dashboard?view=all" : "/dashboard";

  const actions = data?.ok ? data.actions || {} : {};
  const overdueFollowUps = actions.overdueFollowUps || [];
  const dueToday = actions.dueToday || [];
  const invoicesDue = actions.invoicesDue || [];
  const estimatesAwaiting = actions.estimatesAwaiting || [];
  const staleLeads = actions.staleLeads || [];
  const blockedJobs = actions.blockedJobs || [];

  const workItems = useMemo(() => {
    return mergeActions(
      overdueFollowUps,
      invoicesDue,
      blockedJobs,
      estimatesAwaiting,
      staleLeads,
      dueToday,
    );
  }, [
    overdueFollowUps,
    invoicesDue,
    blockedJobs,
    estimatesAwaiting,
    staleLeads,
    dueToday,
  ]);

  const laterItems = useMemo(() => {
    if (!data?.ok) return [];
    const seen = new Set(workItems.map(actionKey));
    return (data.tasks?.nextUp || [])
      .map((task) => taskToItem(task, "Next 7 days"))
      .filter((item) => item && !seen.has(actionKey(item)));
  }, [data, workItems]);

  const overdueCount = workItems.filter(isOverdueItem).length;

  const metrics = [
    {
      id: "overdue",
      label: "Overdue",
      value: String(overdueCount),
      sub: overdueCount ? "Needs you now" : "Nothing overdue",
      tone: overdueCount > 0 ? "danger" : "neutral",
    },
    {
      id: "today",
      label: "Due today",
      value: String(dueToday.length),
      sub: "Follow-ups for today",
    },
    {
      id: "waiting",
      label: "Waiting",
      value: String(estimatesAwaiting.length),
      sub: "Estimates with the client",
    },
    {
      id: "money",
      label: "Invoices",
      value: String(invoicesDue.length),
      sub: "Due soon or overdue",
    },
  ];

  const inventory = useMemo(() => {
    if (!data?.ok) return [];

    const totalLeads = data.leads?.total ?? 0;
    const leadByStatus = Array.isArray(data.leads?.byStatus) ? data.leads.byStatus : [];
    const newLeads = leadByStatus.find((row) => row.status === "New")?.count ?? 0;
    const contactedLeads =
      leadByStatus.find((row) => row.status === "Contacted")?.count ?? 0;
    const qualifiedLeads =
      leadByStatus.find((row) => row.status === "Qualified")?.count ?? 0;

    const jobByStatus = Array.isArray(data.jobs?.byStatus) ? data.jobs.byStatus : [];
    const closedJob = new Set(["Closed Won", "Closed Lost"]);
    const openJobs = jobByStatus
      .filter((row) => !closedJob.has(row.status))
      .reduce((sum, row) => sum + (row.count ?? 0), 0);
    const totalJobs = data.jobs?.total ?? 0;

    const estByStatus = Array.isArray(data.estimates?.byStatus)
      ? data.estimates.byStatus
      : [];
    const totalEstimates = data.estimates?.total ?? 0;
    const draftEst = estByStatus.find((row) => row.status === "Draft")?.count ?? 0;
    const sentEst = estByStatus.find((row) => row.status === "Sent")?.count ?? 0;

    const next7 = data.tasks?.counts?.next_7_days ?? 0;

    return [
      {
        id: "jobs",
        label: "Jobs",
        value: String(totalJobs),
        sub: `${openJobs} open`,
        href: "/jobs",
      },
      {
        id: "estimates",
        label: "Estimates",
        value: String(totalEstimates),
        sub: `${draftEst} draft · ${sentEst} sent`,
        href: "/jobs",
      },
      {
        id: "leads",
        label: "Leads",
        value: String(totalLeads),
        sub: `${newLeads} new · ${contactedLeads} contacted`,
        href: "/leads",
      },
      {
        id: "qualified",
        label: "Qualified",
        value: String(qualifiedLeads),
        sub: "Ready to convert",
        href: "/leads?status=Qualified",
      },
      {
        id: "next7",
        label: "Next 7 days",
        value: String(next7),
        sub: "Upcoming tasks",
        href: "/tasks?duePreset=next_7_days",
      },
    ];
  }, [data]);

  const railFilters = [
    {
      id: "waiting",
      label: "Waiting",
      value: estimatesAwaiting.length,
    },
    {
      id: "money",
      label: "Invoices",
      value: invoicesDue.length,
    },
  ];

  const greeting = greetingFor(user?.first_name);

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

    const nextUser =
      authRes.status === "fulfilled" ? authRes.value?.user || null : null;
    const canLoadWorkload =
      nextUser?.role === "owner" || nextUser?.role === "admin";

    if (canLoadWorkload) {
      try {
        const workloadRes = await api("/dashboard/workload");
        setWorkload(workloadRes?.workload || []);
      } catch {
        setWorkload([]);
      }
    } else {
      setWorkload([]);
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

  async function completeTask(taskId) {
    try {
      setErr("");
      setCompletingId(taskId);
      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Completed" }),
      });
      await refreshDashboardSections({ initial: false, refreshActivity: true });
    } catch (e) {
      setErr(e.message || "Failed to update task");
    } finally {
      setCompletingId(null);
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
      title={greeting}
      description={todayLabel()}
      right={
        <div className="flex flex-wrap items-center gap-2">
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
          {refreshingDashboard ? <LoadingDots /> : null}
        </div>
      }
    >
      <div className="space-y-6">
        {!loading && err ? <PageError message={err} /> : null}

        <AttentionStrip
          metrics={metrics}
          inventory={inventory}
          focus={filter}
          onFocus={setFilter}
          loading={isInitialLoading}
        />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <WorkQueue
            items={workItems}
            laterItems={laterItems}
            filter={filter}
            onFilterChange={setFilter}
            loading={isInitialLoading}
            completingId={completingId}
            onComplete={completeTask}
          />

          <ContextRail
            filters={railFilters}
            focus={filter}
            onFocus={setFilter}
            workload={workload}
            activity={activity}
            canViewTeam={canViewAll}
            loading={isInitialLoading}
            loadingActivity={loadingActivity}
          />
        </div>
      </div>
    </AppShell>
  );
}
