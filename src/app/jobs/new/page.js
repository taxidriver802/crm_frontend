"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JobForm, createEmptyJobForm } from "@/components/forms/job-form";
import { api } from "@/lib/api";

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillLeadId = searchParams.get("lead_id") || "";

  const [form, setForm] = useState(createEmptyJobForm({ lead_id: prefillLeadId }));
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefillLeadId) {
      setForm((prev) => ({ ...prev, lead_id: prefillLeadId }));
    }
  }, [prefillLeadId]);

  useEffect(() => {
    let alive = true;

    async function loadLeads() {
      try {
        setLoadingLeads(true);
        const data = await api("/leads?limit=200&offset=0");
        if (!alive) return;
        setLeads(data.leads || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load leads");
      } finally {
        if (!alive) return;
        setLoadingLeads(false);
      }
    }

    loadLeads();

    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (!form.lead_id.trim()) {
        throw new Error("Please choose a lead.");
      }

      if (!form.title.trim()) {
        throw new Error("Title is required.");
      }

      const payload = {
        lead_id: Number(form.lead_id),
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status || "New",
        address: form.address.trim() || null,
      };

      setSaving(true);

      const data = await api("/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newId = data?.job?.id ?? data?.id;

      if (newId) {
        router.push(`/jobs/${newId}`);
      } else {
        router.push("/jobs");
      }
    } catch (e) {
      setError(e?.message || "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = prefillLeadId ? `New Job for Lead #${prefillLeadId}` : "New Job";

  return (
    <AppShell title={pageTitle}>
      <section className="card rounded-lg p-4">
        <JobForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          saving={saving}
          error={error}
          submitLabel="Create Job"
          cancelLabel="Cancel"
          onCancel={() => router.back()}
          leads={leads}
          loadingLeads={loadingLeads}
        />
      </section>
    </AppShell>
  );
}
