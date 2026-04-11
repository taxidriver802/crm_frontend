"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  EstimateForm,
  EstimateFormSkeleton,
  createEmptyEstimateForm,
} from "@/components/forms/estimate-form";
import { api } from "@/lib/api";

export default function EditEstimatePage() {
  const router = useRouter();
  const { id } = useParams();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState([]);

  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [estimate, setEstimate] = useState(null);

  const [form, setForm] = useState(() =>
    createEmptyEstimateForm({
      job_id: "",
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
    let alive = true;

    async function loadEstimate() {
      if (!id) return;

      try {
        setLoadingEstimate(true);
        setError("");

        const res = await api(`/estimates/${id}`);
        if (!alive) return;

        const est = res?.estimate ?? res;
        setEstimate(est);

        setForm(
          createEmptyEstimateForm({
            job_id: est.job_id ? String(est.job_id) : "",
            title: est.title || "",
            status: est.status || "Draft",
            notes: est.notes || "",
          }),
        );
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Could not load estimate");
      } finally {
        if (!alive) return;
        setLoadingEstimate(false);
      }
    }

    loadEstimate();

    return () => {
      alive = false;
    };
  }, [id]);

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

      const res = await api(`/estimates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updatedId = res?.estimate?.id || id;
      router.push(`/estimates/${updatedId}`);
      router.refresh();
    } catch (e) {
      setError(e?.message || "Failed to update estimate");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving) return;
    const confirmed = window.confirm("Delete this estimate?");
    if (!confirmed) return;
    setSaving(true);

    try {
      await api(`/estimates/${id}`, {
        method: "DELETE",
      });

      const fallbackJobId = estimate?.job_id;
      if (fallbackJobId) {
        router.push(`/jobs/${fallbackJobId}`);
      } else {
        router.push("/jobs");
      }

      router.refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete estimate");
    } finally {
      setSaving(false);
    }
  }

  const title = useMemo(() => {
    return estimate?.title ? `Edit ${estimate.title}` : `Edit Estimate #${id}`;
  }, [estimate, id]);

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
            submitLabel="Update Estimate"
            cancelLabel="Cancel"
            onCancel={() => router.back()}
            jobs={jobs}
            loadingJobs={loadingJobs}
            loadingEstimate={loadingEstimate}
            isContextLocked={false}
            onDelete={handleDelete}
            estimateId={id}
          />
        )}
      </section>
    </AppShell>
  );
}
