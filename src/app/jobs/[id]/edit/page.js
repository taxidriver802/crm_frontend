"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JobForm, createEmptyJobForm } from "@/components/forms/job-form";
import { api } from "@/lib/api";

function jobToForm(job) {
  return createEmptyJobForm({
    lead_id: job?.lead_id ? String(job.lead_id) : "",
    title: job?.title ?? "",
    description: job?.description ?? "",
    status: job?.status ?? "New",
    address: job?.address ?? "",
  });
}

export default function EditJobPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(createEmptyJobForm());
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadJob() {
      try {
        setLoading(true);
        setError("");

        const res = await api(`/jobs/${id}`);
        if (!alive) return;

        const job = res?.job ?? res;
        if (!job) {
          setError("Job not found.");
          return;
        }

        setForm(jobToForm(job));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load job");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    async function loadLeads() {
      try {
        setLoadingLeads(true);
        const res = await api("/leads?limit=200&offset=0");
        if (!alive) return;
        setLeads(res?.leads || []);
      } catch (e) {
        if (!alive) return;
        setError((prev) => prev || e?.message || "Failed to load leads");
      } finally {
        if (!alive) return;
        setLoadingLeads(false);
      }
    }

    if (id) {
      loadJob();
      loadLeads();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.lead_id.trim()) {
      setError("Please choose a lead.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      lead_id: Number(form.lead_id),
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status || "New",
      address: form.address.trim() || null,
    };

    try {
      setSaving(true);

      await api(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push(`/jobs/${id}`);
    } catch (e) {
      setError(e?.message || "Failed to update job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={`Edit Job #${id}`}>
      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : (
        <section className="card rounded-lg p-4">
          <JobForm
            form={form}
            onChange={setForm}
            onSubmit={onSubmit}
            saving={saving}
            error={error}
            submitLabel="Save Changes"
            cancelLabel="Cancel"
            onCancel={() => router.push(`/jobs/${id}`)}
            leads={leads}
            loadingLeads={loadingLeads}
          />
        </section>
      )}
    </AppShell>
  );
}
