"use client";

import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { JobForm, createEmptyJobForm } from "@/components/forms/job-form";
import { api } from "@/lib/api";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { ModalFrame } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { JobsList } from "@/components/lists/jobs-list";
import { PageToolbar } from "@/components/page-toolbar";

const JOB_PIPELINE_COLUMNS = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
];

const JOB_STATUS_SHORT = {
  Contacted: "Touch",
  "Appointment Scheduled": "Appt",
  "Proposal Sent": "Sent",
  "Closed Won": "Won",
  "Closed Lost": "Lost",
};

function JobsPageInner() {
  const push = useReturnPush();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(() => searchParams.get("status") || "");

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
  const [addressPreview, setAddressPreview] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState(
    () => searchParams.get("assignedTo") || "",
  );

  const prefillLeadId = searchParams.get("lead_id") || "";
  const shouldOpenCreate = searchParams.get("open") === "create";
  const statusParam = searchParams.get("status") || "";
  const assignedParam = searchParams.get("assignedTo") || "";

  const [form, setForm] = useState(createEmptyJobForm({ lead_id: prefillLeadId }));

  useEffect(() => {
    setStatus(statusParam);
    setAssignedFilter(assignedParam);
  }, [statusParam, assignedParam]);

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
    () => ({ q, status, assignedFilter, viewScope }),
    [q, status, assignedFilter, viewScope],
  );
  const newJobHref = prefillLeadId
    ? `/jobs/new?lead_id=${prefillLeadId}`
    : "/jobs/new";
  const summaryPath =
    canViewAll && viewScope === "all" ? "/jobs/summary?view=all" : "/jobs/summary";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status && status !== "All") {
      params.set("status", status);
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
  }, [q, status, canViewAll, viewScope, assignedFilter, prefillLeadId]);

  async function handleAssignJob(jobId, assignedTo) {
    const assignee = teamUsers.find((user) => user.id === assignedTo) || null;
    const previous = jobs;

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
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
          : job,
      ),
    );

    try {
      await api(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      });
    } catch (e) {
      setJobs(previous);
      setError(e?.message || "Failed to reassign job");
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateOpen]);

  useEffect(() => {
    if (addressPreview == null) return undefined;

    function onKeyDown(e) {
      if (e.key === "Escape") setAddressPreview(null);
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [addressPreview]);

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

          const nextTotal = (prev.total ?? 0) + 1;
          const nextStatus = payload.status || "New";
          const prevByStatus = Array.isArray(prev.byStatus) ? prev.byStatus : [];
          const exists = prevByStatus.some((item) => item.status === nextStatus);
          const byStatus = exists
            ? prevByStatus.map((item) =>
                item.status === nextStatus ? { ...item, count: item.count + 1 } : item,
              )
            : [...prevByStatus, { status: nextStatus, count: 1 }];

          return {
            ...prev,
            total: nextTotal,
            byStatus,
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

  const byStatus = Array.isArray(summary?.byStatus) ? summary.byStatus : [];
  const pipelineOptions = [
    {
      value: "",
      label: "All",
      count: loadingSummary ? undefined : (summary?.total ?? 0),
    },
    ...JOB_PIPELINE_COLUMNS.map((column) => ({
      value: column,
      label: column,
      short: JOB_STATUS_SHORT[column],
      count: loadingSummary
        ? undefined
        : (byStatus.find((row) => row.status === column)?.count ?? 0),
    })),
  ];

  return (
    <AppShell
      title="Jobs"
      description={
        loadingJobs ? "Loading…" : `${jobs.length} in this view`
      }
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
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        {isCreateOpen ? (
          <section className="card p-4">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">New job</div>
                <p className="text-muted mt-0.5 text-xs">
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
          aria-label="Job status"
          value={status}
          onChange={setStatus}
          options={pipelineOptions}
        />

        <PageToolbar
          search={
            <input
              className="input min-w-0 w-full flex-1 basis-48"
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
                setStatus(String(filters?.status || ""));
                setAssignedFilter(String(filters?.assignedFilter || ""));
                setViewScope(String(filters?.viewScope || "mine"));
              }}
            />
          }
        >
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

        <JobsList
          layout="flush"
          jobs={jobs}
          loading={loadingJobs}
          canViewAll={canViewAll}
          teamUsers={teamUsers}
          onOpen={(jobId) => push(`/jobs/${jobId}`)}
          onAssign={handleAssignJob}
          onShowAddress={setAddressPreview}
        />

        {addressPreview ? (
          <ModalFrame
            open
            onClose={() => setAddressPreview(null)}
            layer="modal"
            labelledBy="job-address-preview-title"
            panelClassName="dropdown-panel relative w-full max-w-md p-4 shadow-lg"
          >
            <h2
              id="job-address-preview-title"
              className="flex w-full items-center gap-2 text-sm font-semibold"
            >
              <div className="border-base flex w-full items-center justify-between border-b pb-2">
                Address
                <button
                  type="button"
                  className="bg-accent/30 hover:bg-accent text-main ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs transition"
                  onClick={async () => {
                    if (addressPreview) {
                      await navigator.clipboard.writeText(addressPreview);
                    }
                  }}
                  title="Copy address to clipboard"
                >
                  Copy
                </button>
              </div>
            </h2>

            <p className="text-main mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {addressPreview}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn px-3 py-1.5 text-xs"
                onClick={() => setAddressPreview(null)}
              >
                Close
              </button>
            </div>
          </ModalFrame>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Jobs">
          <div className="text-muted p-4 text-sm">Loading…</div>
        </AppShell>
      }
    >
      <JobsPageInner />
    </Suspense>
  );
}
