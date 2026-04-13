"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import {
  Skeleton,
  SectionSkeleton,
} from "@/components/loading/loadingSkeletons";

function NewInvoicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillJobId = searchParams.get("job_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState([]);

  const [form, setForm] = useState({
    job_id: prefillJobId,
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    let alive = true;
    async function loadJobs() {
      try {
        setLoadingJobs(true);
        const res = await api("/jobs?limit=200&offset=0");
        if (!alive) return;
        setJobs(res?.jobs || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load jobs");
      } finally {
        if (alive) setLoadingJobs(false);
      }
    }
    loadJobs();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (prefillJobId) setForm((f) => ({ ...f, job_id: prefillJobId }));
  }, [prefillJobId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");

    if (!form.job_id) {
      setError("Please choose a job.");
      return;
    }

    try {
      setSaving(true);
      const res = await api("/invoices", {
        method: "POST",
        body: JSON.stringify({
          job_id: Number(form.job_id),
          status: "Draft",
          due_date: form.due_date || null,
          notes: form.notes.trim() || null,
        }),
      });
      const newId = res?.invoice?.id;
      if (!newId) throw new Error("Invalid response from server");
      router.push(`/invoices/${newId}`);
    } catch (e) {
      setError(e?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  const isContextLocked = !!prefillJobId;

  const title = useMemo(() => {
    if (form.job_id) return `New Invoice for Job #${form.job_id}`;
    return "New Invoice";
  }, [form.job_id]);

  return (
    <AppShell title={title}>
      <section className="card rounded-lg p-4">
        {loadingJobs ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="text-sm font-medium text-red-600">{error}</div>
            ) : null}

            <label className="block text-sm">
              <span className="text-muted text-xs font-medium">Job</span>
              <select
                className="input mt-1 w-full"
                value={form.job_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, job_id: e.target.value }))
                }
                disabled={isContextLocked}
                required
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} (#{j.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-muted text-xs font-medium">
                Due Date (optional)
              </span>
              <input
                type="date"
                className="input mt-1 w-full"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
              />
            </label>

            <label className="block text-sm">
              <span className="text-muted text-xs font-medium">
                Notes (optional)
              </span>
              <textarea
                className="input mt-1 w-full"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes for this invoice…"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn px-4 py-2 text-sm"
                disabled={saving}
              >
                {saving ? "Creating…" : "Create Invoice"}
              </button>
              <button
                type="button"
                className="btn btn-ghost px-4 py-2 text-sm"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <AppShell title="New Invoice">
          <section className="card rounded-lg p-4">
            <SectionSkeleton rows={4} />
          </section>
        </AppShell>
      }
    >
      <NewInvoicePageInner />
    </Suspense>
  );
}
