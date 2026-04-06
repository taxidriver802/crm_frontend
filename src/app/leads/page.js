"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [savingLead, setSavingLead] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(createEmptyLeadForm());

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status && status !== "All") {
      params.set("status", status);
    }

    if (q.trim()) {
      params.set("q", q.trim());
    }

    params.set("limit", "50");
    params.set("offset", "0");

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [q, status]);

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

  return (
    <AppShell title="Leads">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <ToggleFormSection
          title="Create Lead"
          description="Add a new lead to your pipeline without leaving the page."
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Lead"
          closeLabel="Hide Form"
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

        <section className="card rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-muted text-sm">Total leads</div>
              <div className="text-2xl font-semibold">
                {loadingSummary ? "…" : (summary?.total ?? "—")}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {loadingSummary ? (
                <span className="text-muted text-sm">Loading summary…</span>
              ) : summary?.byStatus?.length ? (
                summary.byStatus.map((x) => (
                  <span
                    key={x.status}
                    className="border-base bg-surface rounded-md border px-2 py-1 text-sm"
                  >
                    {x.status}: {x.count}
                  </span>
                ))
              ) : (
                <span className="text-muted text-sm">No summary</span>
              )}
            </div>
          </div>
        </section>

        <section className="card rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-muted text-xs">Search</label>
              <input
                className="input mt-1"
                placeholder="Search name, email, phone…"
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
                <option value="Qualified">Qualified</option>
                <option value="Closed">Closed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Link href="/leads/new" className="btn">
                Full Form
              </Link>

              <button
                className="btn disabled:opacity-60"
                onClick={refreshAll}
                disabled={loadingSummary || loadingLeads}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden rounded-lg">
          <div className="border-base text-muted border-b p-4 text-sm">
            {loadingLeads
              ? "Loading…"
              : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loadingLeads && leads.length === 0 ? (
                  <tr className="border-base border-t">
                    <td className="text-muted px-4 py-6" colSpan={5}>
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-base hover:bg-accent border-t transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-muted mt-1 text-xs">
                          {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="status-chip">{lead.status}</span>
                      </td>

                      <td className="px-4 py-3">{lead.source ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(lead.created_at)}</td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          className="underline underline-offset-4 hover:opacity-80"
                          href={`/leads/${lead.id}`}
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
        </section>
      </div>
    </AppShell>
  );
}
