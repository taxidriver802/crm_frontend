"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { JobForm, createEmptyJobForm } from "@/components/forms/job-form";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { TableRowSkeleton } from "@/components/loading/loadingSkeletons";
import { ListToolbar } from "@/components/list-toolbar";
import { SavedViewsControls } from "@/components/saved-views-controls";

function JobsPageInner() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [addressPreview, setAddressPreview] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState("");

  const searchParams = useSearchParams();
  const prefillLeadId = searchParams.get("lead_id") || "";
  const shouldOpenCreate = searchParams.get("open") === "create";
  const statusFromUrl = searchParams.get("status") || "";

  const [form, setForm] = useState(createEmptyJobForm({ lead_id: prefillLeadId }));

  const canViewAll = currentUser?.role === "owner" || currentUser?.role === "admin";
  const currentFiltersForSave = useMemo(
    () => ({ q, status, assignedFilter, viewScope }),
    [q, status, assignedFilter, viewScope],
  );

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
    if (statusFromUrl) {
      setStatus(statusFromUrl);
    }
  }, [statusFromUrl]);

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

    params.set("limit", "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [q, status, canViewAll, viewScope, assignedFilter]);

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
    await Promise.all([loadJobs(), loadLeads()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

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

      setForm(createEmptyJobForm());
      setIsCreateOpen(false);
      setJobs((prev) => [data.job, ...prev]);
    } catch (e) {
      setCreateError(e.message || "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  const jobTitle = (
    <div>
      {loadingJobs ? "Loading…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
    </div>
  );

  return (
    <AppShell title="Jobs">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <ToggleFormSection
          title="Create Job"
          description="Start a new job workspace tied to an existing lead."
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Job"
          closeLabel="Hide Form"
        >
          <JobForm
            form={form}
            onChange={setForm}
            onSubmit={handleCreateJob}
            saving={creating}
            error={createError}
            submitLabel="Create Job"
            cancelLabel="Clear"
            onCancel={() => {
              setForm(createEmptyJobForm({ lead_id: prefillLeadId || "" }));
              setCreateError("");
            }}
            leads={leads}
            loadingLeads={loadingLeads}
            layout="compact"
          />
        </ToggleFormSection>

        <section className="card rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-muted text-xs">Search</label>
              <input
                className="input mt-1"
                placeholder="Search title, description, address..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-56">
              <label className="text-muted text-xs">Status</label>
              <select
                className="input mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Appointment Scheduled">Appointment Scheduled</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>

            <div className="w-full sm:w-56">
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

            <div className="flex gap-2">
              <Link
                href={prefillLeadId ? `/jobs/new?lead_id=${prefillLeadId}` : "/jobs/new"}
                className="btn"
              >
                Full Form
              </Link>

              <button
                className="btn disabled:opacity-60"
                onClick={refreshAll}
                disabled={loadingJobs || loadingLeads}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>
        <ListToolbar
          left={
            canViewAll ? (
              <div className="border-base bg-surface flex items-center gap-1 rounded-md border p-1">
                <button
                  type="button"
                  className={`btn px-2 py-1 text-xs ${
                    viewScope === "mine" ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => setViewScope("mine")}
                >
                  My Jobs
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
            ) : null
          }
          right={
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
        />

        <CollapsibleSection title={jobTitle} defaultOpen={true}>
          <div className="scrollbar-theme overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingJobs ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={7} />
                  ))
                ) : jobs.length === 0 ? (
                  <tr className="border-base border-t">
                    <td className="text-muted px-4 py-6" colSpan={7}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-base hover:bg-accent border-t transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{job.title}</div>
                        <div className="text-muted mt-1 max-w-[12.5rem] truncate text-xs">
                          {job.description || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {job.lead ? (
                          <Link
                            className="underline underline-offset-4 hover:opacity-80"
                            href={`/leads/${job.lead.id}`}
                          >
                            {job.lead.name}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="status-chip">{job.status}</span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {job.address ? (
                          <button
                            type="button"
                            className="text-main hover:bg-accent -mx-1 block min-w-0 max-w-[min(16rem,45vw)] rounded px-1 py-0.5 text-left transition sm:max-w-[18rem]"
                            title="Show full address"
                            onClick={() => setAddressPreview(job.address)}
                          >
                            <span className="block truncate">{job.address}</span>
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canViewAll ? (
                          <select
                            className="input"
                            value={job.assigned_to || ""}
                            onChange={(e) => handleAssignJob(job.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {teamUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name}
                              </option>
                            ))}
                          </select>
                        ) : job.assigned_user ? (
                          `${job.assigned_user.first_name || ""} ${job.assigned_user.last_name || ""}`.trim() ||
                          job.assigned_user.email
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(job.created_at)}</td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          className="underline underline-offset-4 hover:opacity-80"
                          href={`/jobs/${job.id}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {addressPreview ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-address-preview-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={() => setAddressPreview(null)}
            />
            <div className="dropdown-panel relative z-10 w-full max-w-md p-4 shadow-lg">
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
            </div>
          </div>
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
