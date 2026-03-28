"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function JobsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "New",
    address: "",
  });

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

  async function refreshAll() {
    setError("");
    await loadJobs();
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function handleCreateJob(e) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status || "New",
        address: form.address.trim() || null,
      };

      const data = await api("/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setForm({
        title: "",
        description: "",
        status: "New",
        address: "",
      });

      setJobs((prev) => [data.job, ...prev]);
    } catch (e) {
      setError(e.message || "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Jobs">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        {/* Create Job */}
        <section className="bg-surface border-base rounded-lg border p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Create Job</h2>
            <p className="text-muted mt-1 text-sm">
              Start a new job workspace for work that needs to move through your pipeline.
            </p>
          </div>

          <form
            onSubmit={handleCreateJob}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className="text-muted text-xs">Title</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Example: Roof inspection for 123 Main St"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-muted text-xs">Status</label>
              <select
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Appointment Scheduled">Appointment Scheduled</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>

            <div>
              <label className="text-muted text-xs">Address</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="123 Main St"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-muted text-xs">Description</label>
              <textarea
                className="border-base bg-app mt-1 min-h-[96px] w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Add any context or notes for this job..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </section>

        {/* Filters / Actions */}
        <section className="bg-surface border-base rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-muted text-xs">Search</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Search title, description, address..."
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
                <option value="Appointment Scheduled">Appointment Scheduled</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                onClick={refreshAll}
                disabled={loadingJobs}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-surface border-base overflow-hidden rounded-lg border">
          <div className="border-base text-muted border-b p-4 text-sm">
            {loadingJobs
              ? "Loading…"
              : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent-soft">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loadingJobs && jobs.length === 0 ? (
                  <tr className="border-base border-t">
                    <td className="text-muted px-4 py-6" colSpan={5}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-base hover:bg-accent-soft border-t transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{job.title}</div>
                        <div className="text-muted mt-1 text-xs">
                          {job.description || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="border-base bg-surface inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {job.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">{job.address ?? "—"}</td>
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
