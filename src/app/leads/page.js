"use client";

import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";
import { LeadsList } from "@/components/lists/leads-list";
import { PageToolbar } from "@/components/page-toolbar";
import { useScrollIntoViewOnChange } from "@/lib/use-scroll-into-view-on-change";

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
  const [viewFocusToken, setViewFocusToken] = useState(0);
  const viewContentRef = useScrollIntoViewOnChange(viewFocusToken);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState("mine");
  const [assignedFilter, setAssignedFilter] = useState(
    () => searchParams.get("assignedTo") || "",
  );
  const statusParam = searchParams.get("status") || "";
  const assignedParam = searchParams.get("assignedTo") || "";

  useEffect(() => {
    setStatus(statusParam);
    setAssignedFilter(assignedParam);
  }, [statusParam, assignedParam]);

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

  const byStatus = Array.isArray(summary?.byStatus) ? summary.byStatus : [];
  const pipelineOptions = [
    {
      value: "",
      label: "All",
      count: loadingSummary ? undefined : (summary?.total ?? 0),
    },
    ...LEAD_PIPELINE_COLUMNS.map((column) => ({
      value: column,
      label: column,
      short: column === "Contacted" ? "Touch" : column === "Qualified" ? "Qual" : column,
      count: loadingSummary
        ? undefined
        : (byStatus.find((row) => row.status === column)?.count ?? 0),
    })),
  ];

  return (
    <AppShell
      title="Leads"
      description={
        loadingLeads
          ? "Loading…"
          : `${leads.length} in this view`
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll ? (
            <Segmented
              aria-label="Lead scope"
              value={viewScope}
              onChange={setViewScope}
              options={[
                { value: "mine", label: "Mine", short: "Mine" },
                { value: "all", label: "Team", short: "Team" },
              ]}
            />
          ) : null}
          <Segmented
            aria-label="Lead layout"
            value={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setViewFocusToken((token) => token + 1);
            }}
            options={[
              { value: "list", label: "List" },
              { value: "board", label: "Board" },
            ]}
          />
        </div>
      }
    >
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        {isCreateOpen ? (
          <section className="card p-4">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">New lead</div>
                <p className="text-muted mt-0.5 text-xs">
                  Add to the pipeline without leaving this page.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href="/leads/new" className="btn btn-sm">
                  Full form
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={savingLead}
                >
                  Hide
                </button>
              </div>
            </div>
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
          </section>
        ) : null}

        <Segmented
          className="w-full min-w-0"
          aria-label="Lead status"
          value={status}
          onChange={setStatus}
          options={pipelineOptions}
        />

        <PageToolbar
          search={
            <input
              className="input min-w-0 w-full flex-1 basis-48"
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
          refresh={
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
          create={
            isCreateOpen ? null : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateOpen(true)}
                disabled={savingLead}
              >
                New lead
              </button>
            )
          }
          savedViews={
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

        <div
          ref={viewContentRef}
          id="leads-view"
          className="scroll-mt-20"
        >
          {viewMode === "board" ? (
            <section className="card p-4">
              {loadingLeads ? (
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
              )}
            </section>
          ) : (
            <LeadsList
              layout="flush"
              leads={leads}
              loading={loadingLeads}
              canViewAll={canViewAll}
              teamUsers={teamUsers}
              onOpen={(leadId) => push(`/leads/${leadId}`)}
              onAssign={handleAssignLead}
            />
          )}
        </div>
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
