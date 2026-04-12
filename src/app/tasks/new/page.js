"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TaskForm, createEmptyTaskForm } from "@/components/forms/task-form";
import { api } from "@/lib/api";

function NewTaskPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const prefillLeadId = params.get("lead_id") || "";
  const prefillJobId = params.get("job_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [contextType, setContextType] = useState(prefillJobId ? "job" : "lead");
  const [form, setForm] = useState(
    createEmptyTaskForm({
      lead_id: prefillLeadId,
      job_id: prefillJobId,
    }),
  );

  function handleContextChange(type) {
    setContextType(type);
    setForm((prev) => ({
      ...prev,
      lead_id: type === "lead" ? prev.lead_id : "",
      job_id: type === "job" ? prev.job_id : "",
    }));
  }

  useEffect(() => {
    let alive = true;

    async function loadLeads() {
      try {
        setLoadingLeads(true);
        const res = await api("/leads?limit=200&offset=0");
        if (!alive) return;
        setLeads(res?.leads || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load leads for dropdown");
      } finally {
        if (!alive) return;
        setLoadingLeads(false);
      }
    }

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

    loadLeads();
    loadJobs();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (prefillLeadId) {
      setForm((prev) => ({ ...prev, lead_id: prefillLeadId }));
    }
  }, [prefillLeadId]);

  useEffect(() => {
    if (prefillJobId) {
      setForm((prev) => ({ ...prev, job_id: prefillJobId }));
    }
  }, [prefillJobId]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (contextType === "lead" && !form.lead_id.trim()) {
      setError("Please choose a lead.");
      return;
    }

    if (contextType === "job" && !form.job_id.trim()) {
      setError("Please choose a job.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      lead_id: contextType === "lead" ? Number(form.lead_id) : null,
      job_id: contextType === "job" ? Number(form.job_id) : null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    };

    try {
      setSaving(true);
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/tasks");
    } catch (e) {
      setError(e?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  const isContextLocked = !!prefillLeadId || !!prefillJobId;

  const title = useMemo(() => {
    if (contextType === "lead" && form.lead_id) {
      return `New Task for Lead #${form.lead_id}`;
    }

    if (contextType === "job" && form.job_id) {
      return `New Task for Job #${form.job_id}`;
    }

    return "New Task";
  }, [contextType, form.lead_id, form.job_id]);

  return (
    <AppShell title={title}>
      <section className="card rounded-lg p-4">
        <TaskForm
          form={form}
          onChange={setForm}
          onSubmit={onSubmit}
          saving={saving}
          error={error}
          submitLabel="Create task"
          cancelLabel="Cancel"
          onCancel={() => router.back()}
          contextType={contextType}
          onContextChange={handleContextChange}
          leads={leads}
          jobs={jobs}
          loadingLeads={loadingLeads}
          loadingJobs={loadingJobs}
          isContextLocked={isContextLocked}
        />
      </section>
    </AppShell>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="New Task">
          <section className="card rounded-lg p-4">
            <div className="text-muted text-sm">Loading…</div>
          </section>
        </AppShell>
      }
    >
      <NewTaskPageInner />
    </Suspense>
  );
}
