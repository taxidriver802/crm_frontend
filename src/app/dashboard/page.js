"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

function StatCard({ label, value, sub, href }) {
  const inner = (
    <div className="bg-surface border-base hover:bg-accent/30 rounded-lg border p-4 transition-colors">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted-foreground mt-1 text-sm">{sub}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function SectionCard({ title, right, children }) {
  return (
    <div className="bg-surface border-base rounded-lg border">
      <div className="border-base flex items-center justify-between border-b p-4">
        <div className="text-sm font-medium">{title}</div>
        {right ? <div className="text-sm">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function formatDue(dueDate) {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "Invalid date";

  // Example: Mar 4, 2:30 PM
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TaskRow({ t }) {
  const leadName =
    t.lead_first_name && t.lead_last_name
      ? `${t.lead_first_name} ${t.lead_last_name}`
      : t.lead_id
        ? `Lead #${t.lead_id}`
        : null;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{t.title}</div>
          <div className="text-muted-foreground mt-1 text-sm">
            {(leadName ? `${leadName} • ` : "") + formatDue(t.due_date)}
          </div>
        </div>

        {/* You can wire this to PATCH /tasks/:id later */}
        <button
          className="hover:bg-accent shrink-0 rounded-md border px-3 py-2 text-xs transition-colors"
          onClick={() => alert("Wire me to mark complete 🙂")}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null); // dashboard payload
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("due_today"); // overdue | due_today | next_up
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr("");
        const res = await api("/dashboard");
        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

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
    const t = data.tasks || {};
    if (tab === "overdue") return t.overdueTasks || [];
    if (tab === "due_today") return t.dueTodayTasks || [];
    return t.nextUp || [];
  }, [data, tab]);

  const statusSummary = useMemo(() => {
    const rows = Array.isArray(data?.leads?.byStatus) ? data.leads.byStatus : [];
    // rows look like: { status: "New", count: 3 }
    return rows;
  }, [data]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api("/auth/me", {
          credentials: "include",
        });

        setUser(data?.user || null);
      } catch {
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  const greeting = user?.first_name
    ? `Hello ${user.first_name}, welcome back!`
    : "Hello, welcome back!";

  return (
    <AppShell
      title={
        <div className="flex items-end justify-between">
          <span>Dashboard</span>
          <span className="text-main pt-auto pl-[40px] align-bottom text-sm">
            {greeting}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface border-base rounded-lg border p-4">
                  <div className="bg-muted/40 h-4 w-24 rounded" />
                  <div className="bg-muted/40 mt-3 h-7 w-20 rounded" />
                  <div className="bg-muted/40 mt-2 h-4 w-28 rounded" />
                </div>
              ))
            : stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Error */}
        {!loading && err ? (
          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="text-sm font-medium">Couldn't load dashboard</div>
            <div className="text-muted-foreground mt-1 text-sm">{err}</div>
          </div>
        ) : null}

        {/* Main grid */}
        <div className="grid gap-4 lg:min-h-[600px] lg:grid-cols-3">
          {/* Tasks */}
          <div className="space-y-4 lg:col-span-2">
            <SectionCard
              title="Tasks"
              right={
                <Link className="text-muted-foreground hover:underline" href="/tasks">
                  View all
                </Link>
              }
            >
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                    tab === "overdue" ? "bg-accent" : "hover:bg-accent"
                  }`}
                  onClick={() => setTab("overdue")}
                >
                  Overdue
                </button>
                <button
                  className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                    tab === "due_today" ? "bg-accent" : "hover:bg-accent"
                  }`}
                  onClick={() => setTab("due_today")}
                >
                  Due Today
                </button>
                <button
                  className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                    tab === "next_up" ? "bg-accent" : "hover:bg-accent"
                  }`}
                  onClick={() => setTab("next_up")}
                >
                  Next Up
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="text-muted-foreground text-sm">Loading…</div>
                ) : currentTasks.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nothing here 🎉</div>
                ) : (
                  currentTasks.map((t) => <TaskRow key={t.id} t={t} />)
                )}
              </div>
            </SectionCard>
          </div>

          {/* Lead status breakdown */}
          <div className="flex flex-col space-y-4 lg:col-span-1">
            <SectionCard
              title="Leads by status"
              right={
                <Link className="text-muted-foreground hover:underline" href="/leads">
                  See leads
                </Link>
              }
            >
              {loading ? (
                <div className="text-muted-foreground text-sm">Loading…</div>
              ) : statusSummary.length === 0 ? (
                <div className="text-muted-foreground text-sm">No leads yet</div>
              ) : (
                <div className="space-y-2">
                  {statusSummary.map((row) => (
                    <div
                      key={row.status}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{row.status}</Badge>
                      </div>
                      <div className="text-sm font-semibold">{row.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Quick actions */}
            <div className="bg-surface border-base mt-auto rounded-lg border p-4">
              <div className="text-sm font-medium">Quick actions</div>
              <div className="text-muted-foreground mt-1 text-sm">Add new work fast.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/leads/new"
                  className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
                >
                  New Lead
                </Link>
                <Link
                  href="/tasks/new"
                  className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
                >
                  New Task
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
