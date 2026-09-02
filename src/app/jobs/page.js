"use client";

import { Alert } from "@/components/ui/alert";
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
import { ModalFrame } from "@/components/ui/overlay";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field } from "@/components/ui/field";
import { FilterBar } from "@/components/ui/filter-bar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";

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
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <ToggleFormSection
          title="Create Job"
          description="Start a new job workspace tied to an existing lead."
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Job"
          closeLabel="Hide Form"
          fullFormUrl={
            prefillLeadId ? `/jobs/new?lead_id=${prefillLeadId}` : "/jobs/new"
          }
          fullFormLabel="Full Form"
          disabled={creating}
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

        <FilterBar
          actions={
            <button
              type="button"
              className="icon-btn"
              onClick={refreshAll}
              disabled={loadingJobs || loadingLeads}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
        >
          <Field label="Search" className="flex-1">
            <input
              className="input"
              placeholder="Search title, description, address..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>

          <Field label="Status" className="w-full sm:w-56">
            <select
              className="input"
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
          </Field>

          <Field label="Assigned To" className="w-full sm:w-56">
            <select
              className="input"
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
          </Field>
        </FilterBar>
        <ListToolbar
          left={
            canViewAll ? (
              <Segmented
                aria-label="Job scope"
                value={viewScope}
                onChange={setViewScope}
                options={[
                  { value: "mine", label: "My Jobs" },
                  { value: "all", label: "Team" },
                ]}
              />
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Address</th>
                  <th>Assignee</th>
                  <th>Created</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingJobs ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={7} />
                  ))
                ) : jobs.length === 0 ? (
                  <tr>
                    <td className="text-muted" colSpan={7}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="font-medium">{job.title}</div>
                        <div className="text-muted mt-1 max-w-[12.5rem] truncate text-xs">
                          {job.description || "—"}
                        </div>
                      </td>

                      <td>
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

                      <td>
                        <StatusBadge kind="job" status={job.status} />
                      </td>

                      <td>
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
                      <td>
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
                      <td>{formatDate(job.created_at)}</td>

                      <td className="text-right">
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
