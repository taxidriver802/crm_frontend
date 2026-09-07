"use client";

import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";
import { formatDate, formatDaysInStatus } from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field } from "@/components/ui/field";
import { FilterBar } from "@/components/ui/filter-bar";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";
import { DataTable, Td } from "@/components/ui/data-table";

const LEAD_PIPELINE_COLUMNS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];

function LeadsPageInner() {
  const push = useReturnPush();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(() => searchParams.get("status") || "");

  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [savingLead, setSavingLead] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(createEmptyLeadForm());
  const [viewMode, setViewMode] = useState("list");
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("leads:view-mode");
    if (saved === "list" || saved === "board") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("leads:view-mode", viewMode);
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

  const canViewAll = currentUser?.role === "owner" || currentUser?.role === "admin";
  const currentFiltersForSave = useMemo(
    () => ({ q, status, assignedFilter, viewScope, viewMode }),
    [q, status, assignedFilter, viewScope, viewMode],
  );

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

    params.set("limit", viewMode === "board" ? "200" : "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [q, status, viewMode, canViewAll, viewScope, assignedFilter]);

  async function handleAssignLead(leadId, assignedTo) {
    const assignee = teamUsers.find((user) => user.id === assignedTo) || null;
    const previous = leads;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
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
          : lead,
      ),
    );

    try {
      await api(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      });
    } catch (e) {
      setLeads(previous);
      setError(e?.message || "Failed to reassign lead");
    }
  }

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const data = await api("/leads/summary");
      setSummary(data);
    } catch (e) {
      setError(e.message || "Failed to load leads summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadLeads() {
    setLoadingLeads(true);
    try {
      const data = await api(`/leads${queryString}`);
      setLeads(data.leads || []);
    } catch (e) {
      setError(e.message || "Failed to load leads");
    } finally {
      setLoadingLeads(false);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadSummary(), loadLeads()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function handleCreateLead(e) {
    e.preventDefault();
    setCreateError("");

    if (!leadForm.first_name.trim() || !leadForm.last_name.trim()) {
      setCreateError("First name and last name are required.");
      return;
    }

    const payload = {
      ...leadForm,
      first_name: leadForm.first_name.trim(),
      last_name: leadForm.last_name.trim(),
      email: leadForm.email.trim() || null,
      phone: leadForm.phone.trim() || null,
      source: leadForm.source.trim() || null,
      service_type: leadForm.service_type?.trim() || null,
      preferred_contact_method: leadForm.preferred_contact_method?.trim() || null,
      urgency: leadForm.urgency?.trim() || null,
      notes: leadForm.notes.trim() || null,
      budget_min: leadForm.budget_min ? Number(leadForm.budget_min) : null,
      budget_max: leadForm.budget_max ? Number(leadForm.budget_max) : null,
    };

    try {
      setSavingLead(true);

      const res = await api("/leads", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newLead = res?.lead ?? null;

      setLeadForm(createEmptyLeadForm());
      setIsCreateOpen(false);

      if (newLead) {
        setLeads((prev) => [newLead, ...prev]);

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
      setCreateError(e?.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  }

  async function handleMoveLeadStatus(leadId, nextStatus) {
    const previous = leads;

    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
    );

    setSummary((prev) => {
      if (!prev?.byStatus) return prev;
      const currentLead = previous.find((lead) => lead.id === leadId);
      const prevStatus = currentLead?.status;
      if (!prevStatus || prevStatus === nextStatus) return prev;

      const byStatus = prev.byStatus.map((item) => {
        if (item.status === prevStatus) {
          return { ...item, count: Math.max(0, item.count - 1) };
        }
        if (item.status === nextStatus) {
          return { ...item, count: item.count + 1 };
        }
        return item;
      });

      if (!byStatus.some((item) => item.status === nextStatus)) {
        byStatus.push({ status: nextStatus, count: 1 });
      }

      return { ...prev, byStatus };
    });

    try {
      await api(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      setLeads(previous);
      setError(e?.message || "Failed to update lead status");
      await refreshAll();
    }
  }

  const leadTitle = (
    <div>
      {loadingLeads ? "Loading…" : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
    </div>
  );

  return (
    <AppShell title="Leads">
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <ToggleFormSection
          title="Create Lead"
          description="Add a new lead to your pipeline without leaving the page."
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Lead"
          closeLabel="Hide Form"
          fullFormUrl="/leads/new"
          fullFormLabel="Full Form"
          disabled={savingLead}
        >
          <LeadForm
            form={leadForm}
            onChange={setLeadForm}
            onSubmit={handleCreateLead}
            saving={savingLead}
            error={createError}
            submitLabel="Create lead"
            cancelLabel="Clear"
            onCancel={() => {
              setLeadForm(createEmptyLeadForm());
              setCreateError("");
            }}
            layout="compact"
          />
        </ToggleFormSection>

        {/* <section className="card p-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <div>
              <div className="text-muted text-sm">Total leads</div>
              <div className="text-2xl font-semibold tracking-tight">
                {loadingSummary ? (
                  <Skeleton className="h-8 w-6" />
                ) : (
                  (summary?.total ?? "—")
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {loadingSummary ? (
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20 rounded-md" />
                  ))}
                </div>
              ) : summary?.byStatus?.length ? (
                summary.byStatus.map((x) => (
                  <StatusBadge key={x.status} kind="lead" status={x.status}>
                    {x.status}: {x.count}
                  </StatusBadge>
                ))
              ) : (
                <span className="text-muted text-sm">No summary</span>
              )}
            </div>
          </div>
        </section> */}

        <FilterBar
          actions={
            <button
              type="button"
              className="icon-btn"
              onClick={refreshAll}
              disabled={loadingSummary || loadingLeads}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
          footer={
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {canViewAll ? (
                  <Segmented
                    aria-label="Lead scope"
                    value={viewScope}
                    onChange={setViewScope}
                    options={[
                      { value: "mine", label: "My Leads" },
                      { value: "all", label: "Team" },
                    ]}
                  />
                ) : null}

                <Segmented
                  aria-label="Lead layout"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: "list", label: "List" },
                    { value: "board", label: "Board" },
                  ]}
                />
              </div>

              <SavedViewsControls
                entityType="leads"
                currentFilters={currentFiltersForSave}
                onApplyFilters={(filters) => {
                  setQ(String(filters?.q || ""));
                  setStatus(String(filters?.status || ""));
                  setAssignedFilter(String(filters?.assignedFilter || ""));
                  setViewScope(String(filters?.viewScope || "mine"));
                  setViewMode(
                    filters?.viewMode === "board" || filters?.viewMode === "list"
                      ? filters.viewMode
                      : "list",
                  );
                }}
              />
            </>
          }
        >
          <Field label="Search" className="flex-1">
            <input
              className="input"
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>

          <Field label="Status" className="w-full md:w-56">
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Closed">Closed</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Assigned To" className="w-full md:w-56">
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

        <CollapsibleSection title={leadTitle} defaultOpen={true}>
          {viewMode === "board" ? (
            loadingLeads ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="list-row">
                    <Skeleton className="mb-2 h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : leads.length === 0 ? (
              <EmptyState title="No leads found" />
            ) : (
              <KanbanBoard
                leads={leads}
                columns={LEAD_PIPELINE_COLUMNS}
                onMove={handleMoveLeadStatus}
              />
            )
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {loadingLeads ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <Td primary>
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </Td>
                      <Td label="Status">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </Td>
                      <Td label="Source">
                        <Skeleton className="h-4 w-20" />
                      </Td>
                      <Td label="Assignee">
                        <Skeleton className="h-4 w-24" />
                      </Td>
                      <Td label="Created">
                        <Skeleton className="h-4 w-24" />
                      </Td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <Td empty className="text-muted" colSpan={5}>
                      No leads found.
                    </Td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer"
                      role="link"
                      tabIndex={0}
                      onClick={() => push(`/leads/${lead.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          push(`/leads/${lead.id}`);
                        }
                      }}
                    >
                      <Td primary label="Name">
                        <div className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-muted mt-1 text-xs">
                          {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
                        </div>
                      </Td>

                      <Td label="Status">
                        <StatusBadge kind="lead" status={lead.status} />
                        {formatDaysInStatus(lead.status_changed_at) ? (
                          <div className="text-muted mt-1 text-xs">
                            {formatDaysInStatus(lead.status_changed_at)}
                          </div>
                        ) : null}
                      </Td>

                      <Td label="Source">{lead.source ?? "—"}</Td>
                      <Td label="Assignee">
                        {canViewAll ? (
                          <select
                            className="input"
                            value={lead.assigned_to || ""}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleAssignLead(lead.id, e.target.value);
                            }}
                          >
                            <option value="">Unassigned</option>
                            {teamUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name}
                              </option>
                            ))}
                          </select>
                        ) : lead.assigned_user ? (
                          `${lead.assigned_user.first_name || ""} ${lead.assigned_user.last_name || ""}`.trim() ||
                          lead.assigned_user.email
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Td>
                      <Td label="Created">{formatDate(lead.created_at)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          )}
        </CollapsibleSection>
      </div>
    </AppShell>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Leads">
          <div className="text-muted p-4 text-sm">Loading…</div>
        </AppShell>
      }
    >
      <LeadsPageInner />
    </Suspense>
  );
}
