"use client";

import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JobForm, createEmptyJobForm } from "@/components/forms/job-form";
import { api } from "@/lib/api";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { RecordTable, runBulk } from "@/components/ui/record-table";
import { JOB_COLUMNS } from "@/components/lists/columns";
import { useToast } from "@/components/toast/toast-provider";
import { PageToolbar } from "@/components/page-toolbar";
import { JOB_PHASES, JOB_STATUSES, phaseOf } from "@/lib/job-lifecycle";

const PHASE_IDS = JOB_PHASES.map((phase) => phase.id);

function JobsPageInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  // Exact status (deep links from the dashboard) or a lifecycle phase.
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [phase, setPhase] = useState(() => {
    const raw = searchParams.get("phase") || "";
    return PHASE_IDS.includes(raw) ? raw : "";
  });

  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState(
    () => searchParams.get("assignedTo") || "",
  );

  const prefillLeadId = searchParams.get("lead_id") || "";
  const shouldOpenCreate = searchParams.get("open") === "create";
  const statusParam = searchParams.get("status") || "";
  const phaseParam = searchParams.get("phase") || "";
  const assignedParam = searchParams.get("assignedTo") || "";

  const [form, setForm] = useState(createEmptyJobForm({ lead_id: prefillLeadId }));

  useEffect(() => {
    setStatus(JOB_STATUSES.includes(statusParam) ? statusParam : "");
    setPhase(PHASE_IDS.includes(phaseParam) ? phaseParam : "");
    setAssignedFilter(assignedParam);
  }, [statusParam, phaseParam, assignedParam]);

  useEffect(() => {
    if (prefillLeadId) {
      setForm((prev) => ({
        ...prev,
        lead_id: prefillLeadId,
      }));
    }
  }, [prefillLeadId]);

  useEffect(() => {
    if (shouldOpenCreate) {
      setIsCreateOpen(true);
    }
  }, [shouldOpenCreate]);

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

  const canViewAll = currentUser?.role === "owner" || currentUser?.role === "admin";
  const currentFiltersForSave = useMemo(
    () => ({ q, status, phase, assignedFilter, viewScope }),
    [q, status, phase, assignedFilter, viewScope],
  );
  const newJobHref = prefillLeadId ? `/jobs/new?lead_id=${prefillLeadId}` : "/jobs/new";
  const summaryPath =
    canViewAll && viewScope === "all" ? "/jobs/summary?view=all" : "/jobs/summary";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status && status !== "All") {
      params.set("status", status);
    } else if (phase) {
      params.set("phase", phase);
    }

    if (q.trim()) {
      params.set("q", q.trim());
    }

    if (canViewAll && viewScope === "all") {
      params.set("view", "all");
    }

    if (assignedFilter) {
      params.set("assignedTo", assignedFilter);
    }

    if (prefillLeadId.trim()) {
      params.set("leadId", prefillLeadId.trim());
    }

    params.set("limit", "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [q, status, phase, canViewAll, viewScope, assignedFilter, prefillLeadId]);

  async function bulkAssign(rows, assignedTo, clear) {
    const result = await runBulk(rows, (row) =>
      api(`/jobs/${row.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: assignedTo || null }) }),
    );
    clear();
    await refreshAll();
    showToast(
      result.failed
        ? `${result.ok} reassigned, ${result.failed} not: ${result.firstError}`
        : `${result.ok} job${result.ok === 1 ? "" : "s"} reassigned`,
      { tone: result.failed ? "danger" : "success" },
    );
  }

  async function bulkStatus(rows, nextStatus, clear) {
    const result = await runBulk(rows, (row) =>
      api(`/jobs/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }),
    );
    clear();
    await refreshAll();
    showToast(
      result.failed
        ? `${result.ok} moved to ${nextStatus}; ${result.failed} could not move (${result.firstError})`
        : `${result.ok} job${result.ok === 1 ? "" : "s"} moved to ${nextStatus}`,
      { tone: result.failed ? "danger" : "success" },
    );
  }

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const data = await api(summaryPath);
      setSummary(data);
    } catch (e) {
      setError(e.message || "Failed to load jobs summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const data = await api(`/jobs${queryString}`);
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
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

  async function refreshAll() {
    setError("");
    await Promise.all([
      loadSummary(),
      loadJobs(),
      isCreateOpen ? loadLeads() : Promise.resolve(),
    ]);
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryPath]);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!isCreateOpen) return;
    loadLeads();
  }, [isCreateOpen]);

  async function handleCreateJob(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      if (!form.lead_id.trim()) {
        throw new Error("Please choose a lead.");
      }

      if (!form.title.trim()) {
        throw new Error("Title is required.");
      }

      const payload = {
        lead_id: Number(form.lead_id),
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status || "New",
        address: form.address.trim() || null,
      };

      const data = await api("/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newJob = data?.job ?? null;

      setForm(createEmptyJobForm({ lead_id: prefillLeadId || "" }));
      setIsCreateOpen(false);
      setCreateError("");

      if (newJob) {
        setJobs((prev) => [newJob, ...prev]);
        setSummary((prev) => {
          if (!prev) return prev;
          const nextPhase = phaseOf(newJob.status || payload.status || "New");
          const prevByPhase = Array.isArray(prev.byPhase) ? prev.byPhase : [];
          return {
            ...prev,
            total: (prev.total ?? 0) + 1,
            byPhase: prevByPhase.map((item) =>
              item.phase === nextPhase ? { ...item, count: item.count + 1 } : item,
            ),
          };
        });
      } else {
        await refreshAll();
      }
    } catch (e) {
      setCreateError(e.message || "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  const byPhase = Array.isArray(summary?.byPhase) ? summary.byPhase : [];
  const phaseOptions = [
    {
      value: "",
      label: "All",
      count: loadingSummary ? undefined : (summary?.total ?? 0),
    },
    ...JOB_PHASES.map((p) => ({
      value: p.id,
      label: p.label,
      short: p.short,
      count: loadingSummary
        ? undefined
        : (byPhase.find((row) => row.phase === p.id)?.count ?? 0),
      countTone: p.id === "billing" ? "warning" : undefined,
    })),
  ];

  return (
    <AppShell
      title="Jobs"
      description={loadingJobs ? "Loading…" : `${jobs.length} in this view`}
      right={
        canViewAll ? (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              aria-label="Job scope"
              value={viewScope}
              onChange={setViewScope}
              options={[
                { value: "mine", label: "Mine", short: "Mine" },
                { value: "all", label: "Team", short: "Team" },
              ]}
            />
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        {isCreateOpen ? (
          <section className="card p-4">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">New job</div>
                <p className="mt-0.5 text-xs text-muted">
                  Start a workspace tied to an existing lead.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={newJobHref} className="btn btn-sm">
                  Full form
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                >
                  Hide
                </button>
              </div>
            </div>
            <JobForm
              form={form}
              onChange={setForm}
              onSubmit={handleCreateJob}
              saving={creating}
              error={createError}
              submitLabel="Create job"
              cancelLabel="Clear"
              onCancel={() => {
                setForm(createEmptyJobForm({ lead_id: prefillLeadId || "" }));
                setCreateError("");
              }}
              leads={leads}
              loadingLeads={loadingLeads}
              layout="compact"
            />
          </section>
        ) : null}

        <Segmented
          className="w-full min-w-0"
          aria-label="Job phase"
          value={status ? "__status" : phase}
          onChange={(value) => {
            setStatus("");
            setPhase(value);
          }}
          options={phaseOptions}
        />

        {status ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Status: {status}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setStatus("")}
            >
              Clear
            </button>
          </div>
        ) : null}

        <PageToolbar
          search={
            <input
              className="input w-full min-w-0 flex-1 basis-48"
              placeholder="Search title, description, address…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={refreshAll}
              disabled={loadingSummary || loadingJobs}
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
                disabled={creating}
              >
                New job
              </button>
            )
          }
          savedViews={
            <SavedViewsControls
              entityType="jobs"
              currentFilters={currentFiltersForSave}
              onApplyFilters={(filters) => {
                setQ(String(filters?.q || ""));
                const savedStatus = String(filters?.status || "");
                setStatus(JOB_STATUSES.includes(savedStatus) ? savedStatus : "");
                const savedPhase = String(filters?.phase || "");
                setPhase(PHASE_IDS.includes(savedPhase) ? savedPhase : "");
                setAssignedFilter(String(filters?.assignedFilter || ""));
                setViewScope(String(filters?.viewScope || "mine"));
              }}
            />
          }
        >
          <select
            className="input w-full min-w-0 sm:w-48"
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

        <RecordTable
          listKey="jobs"
          kind="job"
          rows={jobs}
          columns={JOB_COLUMNS}
          loading={loadingJobs}
          getHref={(row) => `/jobs/${row.id}`}
          selectable
          emptyTitle={q || phase || status ? "No jobs match this view" : "No jobs yet"}
          emptyDescription={
            q || phase || status
              ? "Clear a filter or search for something else."
              : "Jobs start from a lead. Create one with New job or the Create button."
          }
          bulkActions={(rows, clear) => (
            <>
              {canViewAll ? (
                <select
                  aria-label="Assign selected jobs"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    bulkAssign(rows, e.target.value === "unassigned" ? null : e.target.value, clear);
                  }}
                >
                  <option value="">Assign to…</option>
                  <option value="unassigned">Unassigned</option>
                  {teamUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                aria-label="Move selected jobs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) bulkStatus(rows, e.target.value, clear);
                }}
              >
                <option value="">Move to…</option>
                {JOB_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </>
          )}
        />
      </div>
    </AppShell>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Jobs">
          <div className="p-4 text-sm text-muted">Loading…</div>
        </AppShell>
      }
    >
      <JobsPageInner />
    </Suspense>
  );
}
