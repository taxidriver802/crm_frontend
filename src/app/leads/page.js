"use client";

import { readParam, useUrlFilterSync } from "@/lib/url-filters";
import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SavedViewsControls } from "@/components/saved-views-controls";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";
import { RecordTable, runBulk } from "@/components/ui/record-table";
import { LEAD_COLUMNS } from "@/components/lists/columns";
import { useToast } from "@/components/toast/toast-provider";
import { PageToolbar } from "@/components/page-toolbar";
import { useScrollIntoViewOnChange } from "@/lib/use-scroll-into-view-on-change";

const LEAD_PIPELINE_COLUMNS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];

function LeadsPageInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(() => searchParams.get("status") || "");

  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [viewFocusToken, setViewFocusToken] = useState(0);
  const viewContentRef = useScrollIntoViewOnChange(viewFocusToken);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [viewScope, setViewScope] = useState(() => readParam(searchParams, "scope", "mine", ["mine", "all"]));
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
  const summaryPath =
    canViewAll && viewScope === "all" ? "/leads/summary?view=all" : "/leads/summary";
  const currentFiltersForSave = useMemo(
    () => ({ q, status, assignedFilter, viewScope, viewMode }),
    [q, status, assignedFilter, viewScope, viewMode],
  );
  useUrlFilterSync(
    { q, status, assignedTo: assignedFilter, scope: viewScope },
    { q: "", status: "", assignedTo: "", scope: "mine" },
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

  async function bulkLeads(rows, body, label, clear) {
    const result = await runBulk(rows, (row) =>
      api(`/leads/${row.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    );
    clear();
    await refreshAll();
    showToast(
      result.failed
        ? `${result.ok} ${label}; ${result.failed} failed (${result.firstError})`
        : `${result.ok} lead${result.ok === 1 ? "" : "s"} ${label}`,
      { tone: result.failed ? "danger" : "success" },
    );
  }

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const data = await api(summaryPath);
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

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryPath]);

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
      description={loadingLeads ? "Loading…" : `${leads.length} in this view`}
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
              className="input w-full min-w-0 flex-1 basis-48"
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
            <Link href="/leads/new" className="btn btn-primary">
              New lead
            </Link>
          }
          savedViews={
            <SavedViewsControls
              entityType="leads"
              listPath="/leads"
              currentFilters={currentFiltersForSave}
              onApplyFilters={(filters) => {
                const next = {
                  q: String(filters?.q || ""),
                  status: String(filters?.status || ""),
                  assignedFilter: String(filters?.assignedFilter || ""),
                  viewScope: filters?.viewScope === "all" && canViewAll ? "all" : "mine",
                  viewMode: filters?.viewMode === "board" ? "board" : "list",
                };
                setQ(next.q);
                setStatus(next.status);
                setAssignedFilter(next.assignedFilter);
                setViewScope(next.viewScope);
                setViewMode(next.viewMode);
                return next;
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

        <div ref={viewContentRef} id="leads-view" className="scroll-mt-20">
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
            <RecordTable
              listKey="leads"
              kind="lead"
              rows={leads}
              columns={LEAD_COLUMNS}
              loading={loadingLeads}
              getHref={(row) => `/leads/${row.id}`}
              selectable
              emptyTitle={q || status ? "No leads match this view" : "No leads yet"}
              emptyDescription={
                q || status
                  ? "Clear a filter or search for something else."
                  : "Add one with New lead, or share your intake link so they come to you."
              }
              bulkActions={(rows, clear) => (
                <>
                  {canViewAll ? (
                    <select
                      aria-label="Assign selected leads"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value === "") return;
                        bulkLeads(
                          rows,
                          { assigned_to: e.target.value === "unassigned" ? null : e.target.value },
                          "reassigned",
                          clear,
                        );
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
                    aria-label="Set status of selected leads"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) bulkLeads(rows, { status: e.target.value }, `set to ${e.target.value}`, clear);
                    }}
                  >
                    <option value="">Set status…</option>
                    {LEAD_PIPELINE_COLUMNS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </>
              )}
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
          <div className="p-4 text-sm text-muted">Loading…</div>
        </AppShell>
      }
    >
      <LeadsPageInner />
    </Suspense>
  );
}
