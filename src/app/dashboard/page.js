"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { formatDue } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ActivityList } from "@/components/activity-list";
import { useParams } from "next/navigation";

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

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("due_today");

  const stats = useMemo(() => {
    if (!data?.ok) return [];

    const totalLeads = data.leads?.total ?? 0;
    const byStatus = Array.isArray(data.leads?.byStatus) ? data.leads.byStatus : [];
    const newCount = byStatus.find((s) => s.status === "New")?.count ?? 0;

    const counts = data.tasks?.counts || {};
    const overdue = counts.overdue ?? 0;
    const dueToday = counts.due_today ?? 0;
    const next7 = counts.next_7_days ?? 0;

    return [
      {
        label: "Total Leads",
        value: String(totalLeads),
        sub: `${newCount} new`,
        href: "/leads",
      },
      {
        label: "New",
        value: String(newCount),
        sub: "Status = New",
        href: "/leads?status=New",
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

  const taskTitle = (
    <div className="flex gap-5">
      <Link className="hover:underline" href="/tasks">
        Tasks
      </Link>
    </div>
  );

  function TaskRow({ t }) {
    const leadName = getTaskLeadLabel(t);

    return (
      <div className="border-base hover:bg-accent rounded-lg border p-3 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium">{t.title}</div>
            <div className="text-muted mt-1 text-sm">
              {(leadName ? `${leadName} • ` : "") + formatDue(t.due_date)}
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

  async function refreshDashboardSections() {
    setLoading(true);
    setLoadingActivity(true);
    setErr("");

    const [dashboardRes, authRes, activityRes] = await Promise.allSettled([
      api("/dashboard"),
      api("/auth/me", { credentials: "include" }),
      api("/dashboard/activities"),
    ]);

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

    if (activityRes.status === "fulfilled") {
      setActivity(activityRes.value?.activity || []);
    } else {
      setActivity([]);
    }

    setLoading(false);
    setLoadingActivity(false);
  }

  async function setTaskStatus(taskId, nextStatus) {
    try {
      setErr("");

      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      await refreshDashboardSections();
    } catch (e) {
      setErr(e.message || "Failed to update task");
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        await refreshDashboardSections();
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
      right={<div className="text-muted text-sm">{greeting}</div>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card rounded-lg p-4">
                  <div className="bg-accent h-4 w-24 rounded opacity-20" />
                  <div className="bg-accent mt-3 h-7 w-20 rounded opacity-20" />
                  <div className="bg-accent mt-2 h-4 w-28 rounded opacity-20" />
                </div>
              ))
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
                {loading ? (
                  <div className="text-muted text-sm">Loading…</div>
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
                  <div className="text-muted text-sm">Loading activity…</div>
                </div>
              ) : activity.length === 0 ? (
                <div className="space-y-3">
                  <div className="text-muted text-sm">No recent activity</div>
                </div>
              ) : (
                <ActivityList activity={activity.slice(0, 6)} loading={loadingActivity} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title={leadTitle} defaultOpen={true}>
              {loading ? (
                <div className="text-muted text-sm">Loading…</div>
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
