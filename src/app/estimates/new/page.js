"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  EstimateForm,
  EstimateFormSkeleton,
  createEmptyEstimateForm,
} from "@/components/forms/estimate-form";
import { api } from "@/lib/api";

function NewEstimatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillJobId = searchParams.get("job_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState([]);

  const [form, setForm] = useState(() =>
    createEmptyEstimateForm({
      job_id: prefillJobId,
      status: "Draft",
    }),
  );

  const JOBS_LIMIT = 200;

  useEffect(() => {
    let alive = true;

    async function loadJobs() {
      try {
        setLoadingJobs(true);
        const res = await api(`/jobs?limit=${JOBS_LIMIT}&offset=0`);
        if (!alive) return;
        setJobs(res?.jobs || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load jobs for dropdown");
      } finally {
        if (!alive) return;
        setLoadingJobs(false);
      }
    }

    loadJobs();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (prefillJobId) {
      setForm((prev) => ({ ...prev, job_id: prefillJobId }));
    }
  }, [prefillJobId]);

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");

    if (!form.job_id) {
      setError("Please choose a job.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      job_id: Number(form.job_id),
      title: form.title.trim(),
      status: form.status || "Draft",
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);

      const res = await api("/estimates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newId = res?.estimate?.id;

      if (!newId) {
        throw new Error("Invalid response from server");
      }

      router.push(`/estimates/${newId}`);
    } catch (e) {
      setError(e?.message || "Failed to create estimate");
    } finally {
      setSaving(false);
    }
  }

  const isContextLocked = !!prefillJobId;

  const title = useMemo(() => {
    if (form.job_id) return `New Estimate for Job #${form.job_id}`;
    return "New Estimate";
  }, [form.job_id]);

  return (
    <AppShell title={title}>
      <section className="card rounded-lg p-4">
        {loadingJobs ? (
          <EstimateFormSkeleton onCancel={() => router.back()} />
        ) : (
          <EstimateForm
            form={form}
            onChange={setForm}
            onSubmit={onSubmit}
            saving={saving}
            error={error}
            submitLabel="Create Estimate"
            cancelLabel="Cancel"
            onCancel={() => router.back()}
            jobs={jobs}
            loadingJobs={loadingJobs}
            loadingEstimate={false}
            isContextLocked={isContextLocked}
            onDelete={null}
            estimateId={null}
          />
        )}
      </section>
    </AppShell>
  );
}

export default function NewEstimatePage() {
  return (
    <Suspense
      fallback={
        <AppShell title="New Estimate">
          <section className="card rounded-lg p-4">
            <EstimateFormSkeleton onCancel={() => {}} />
          </section>
        </AppShell>
      }
    >
      <NewEstimatePageInner />
    </Suspense>
  );
}
