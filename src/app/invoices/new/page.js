"use client";

import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { Suspense, useEffect, useState } from "react";
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
  const relatedJob = prefillJobId
    ? jobs.find((job) => String(job.id) === String(prefillJobId))
    : null;

  return (
    <AppShell title="New invoice" description={relatedJob?.title || undefined}>
      <section className="card p-4">
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
              <Alert variant="inline" className="font-medium">{error}</Alert>
            ) : null}

            <Field label="Job" required>
              <select
                className="input"
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
            </Field>

            <Field label="Due Date (optional)">
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
              />
            </Field>

            <Field label="Notes (optional)">
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes for this invoice…"
              />
            </Field>

            <FormActions>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Creating…" : "Create invoice"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </FormActions>
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
        <AppShell title="New invoice">
          <section className="card p-4">
            <SectionSkeleton rows={4} />
          </section>
        </AppShell>
      }
    >
      <NewInvoicePageInner />
    </Suspense>
  );
}
