"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
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

  return (
    <AppShell title="Leads">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        {/* Summary */}
        <section className="bg-surface border-base rounded-lg border p-4">
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

        {/* Filters / Actions */}
        <section className="bg-surface border-base rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-muted text-xs">Search</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Search name, email, phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-56">
              <label className="text-muted text-xs">Status</label>
              <select
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
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
              <Link
                href="/leads/new"
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              >
                New Lead
              </Link>

              <button
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                onClick={refreshAll}
                disabled={loadingSummary || loadingLeads}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-surface border-base overflow-hidden rounded-lg border">
          <div className="border-base text-muted border-b p-4 text-sm">
            {loadingLeads
              ? "Loading…"
              : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent-soft">
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
                  leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-base hover:bg-accent-soft border-t transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {l.first_name} {l.last_name}
                        </div>
                        <div className="text-muted mt-1 text-xs">
                          {(l.email ?? "—") + (l.phone ? ` • ${l.phone}` : "")}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="border-base bg-surface inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {l.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">{l.source ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(l.created_at)}</td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          className="underline underline-offset-4 hover:opacity-80"
                          href={`/leads/${l.id}`}
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

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}
