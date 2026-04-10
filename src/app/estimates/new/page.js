"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  EstimateForm,
  EstimateFormSkeleton,
  createEmptyEstimateForm,
} from "@/components/forms/estimate-form";
import { api } from "@/lib/api";

export default function NewEstimatePage() {
  const router = useRouter();
  const params = useSearchParams();

  const prefillJobId = params.get("job_id") || "";
  const paramsEstimateId = params.get("estimate_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState([]);

  const [loadingEstimate, setLoadingEstimate] = useState(!!paramsEstimateId);

  const [form, setForm] = useState(() =>
    createEmptyEstimateForm({
      job_id: prefillJobId,
      status: "Draft",
    }),
  );

  useEffect(() => {
    let alive = true;

    async function loadEstimate() {
      if (!paramsEstimateId) return;
      setLoadingEstimate(true);

      try {
        const res = await api(`/estimates/${paramsEstimateId}`);

        if (!alive) return;

        const est = res?.estimate;

        if (est) {
          setForm(
            createEmptyEstimateForm({
              job_id: est.job_id || prefillJobId,
              title: est.title || "",
              status: est.status || "Draft",
              notes: est.notes || "",
            }),
          );
        }
      } catch (e) {
        if (!alive) return;
        setError("Could not prefill data");
      } finally {
        setLoadingEstimate(false);
      }
    }

    loadEstimate();

    return () => {
      alive = false;
    };
  }, [paramsEstimateId, prefillJobId]);

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
    if (prefillJobId && !paramsEstimateId) {
      setForm((prev) => ({ ...prev, job_id: prefillJobId }));
    }
  }, [prefillJobId, paramsEstimateId]);

  async function onSubmit(e) {
    e.preventDefault();
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

    const method = paramsEstimateId ? "PATCH" : "POST";
    const url = paramsEstimateId ? `/estimates/${paramsEstimateId}` : "/estimates";

    try {
      setSaving(true);

      const res = await api(url, {
        method,
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
    if (paramsEstimateId) return `Edit Estimate #${paramsEstimateId}`;
    if (form.job_id) return `New Estimate for Job #${form.job_id}`;
    return "New Estimate";
  }, [form.job_id, paramsEstimateId]);

  const submitLabel = paramsEstimateId ? "Update Estimate" : "Create Estimate";

  async function handleDelete() {
    const confirmed = window.confirm("Delete this Estimate?");
    if (!confirmed) return;
    try {
      const res = await api(`/estimates/${paramsEstimateId}`, {
        method: "DELETE",
      });
      router.push(`/jobs/${prefillJobId}`);
      router.refresh();
    } catch (e) {
      setError(e.message || "Failed to delete estimate");
    }
  }

  return (
    <AppShell title={title}>
      <section className="card rounded-lg p-4">
        {loadingEstimate ? (
          <EstimateFormSkeleton onCancel={() => router.back()} />
        ) : (
          <EstimateForm
            form={form}
            onChange={setForm}
            onSubmit={onSubmit}
            saving={saving}
            error={error}
            submitLabel={submitLabel}
            cancelLabel="Cancel"
            onCancel={() => router.back()}
            jobs={jobs}
            loadingJobs={loadingJobs}
            loadingEstimate={loadingEstimate}
            isContextLocked={isContextLocked}
            onDelete={handleDelete}
            estimateId={paramsEstimateId}
          />
        )}
      </section>
    </AppShell>
  );
}
