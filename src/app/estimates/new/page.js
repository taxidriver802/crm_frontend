"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EstimateForm, createEmptyEstimateForm } from "@/components/forms/estimate-form";
import { api } from "@/lib/api";

export default function NewEstimatePage() {
  const router = useRouter();
  const params = useSearchParams();

  const prefillJobId = params.get("job_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState([]);

  const [form, setForm] = useState(
    createEmptyEstimateForm({
      job_id: prefillJobId,
      status: "Draft",
    }),
  );

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
    setError("");

    if (!form.job_id.trim()) {
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

      if (newId) {
        router.push(`/estimates/${newId}`);
      } else if (prefillJobId) {
        router.push(`/jobs/${prefillJobId}`);
      } else {
        router.push("/jobs");
      }
    } catch (e) {
      setError(e?.message || "Failed to create estimate");
    } finally {
      setSaving(false);
    }
  }

  const isContextLocked = !!prefillJobId;

  const title = useMemo(() => {
    if (form.job_id) {
      return `New Estimate for Job #${form.job_id}`;
    }
    return "New Estimate";
  }, [form.job_id]);

  return (
    <AppShell title={title}>
      <section className="card rounded-lg p-4">
        <EstimateForm
          form={form}
          onChange={setForm}
          onSubmit={onSubmit}
          saving={saving}
          error={error}
          submitLabel="Create estimate"
          cancelLabel="Cancel"
          onCancel={() => router.back()}
          jobs={jobs}
          loadingJobs={loadingJobs}
          isContextLocked={isContextLocked}
        />
      </section>
    </AppShell>
  );
}
