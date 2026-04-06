"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TaskForm, createEmptyTaskForm } from "@/components/forms/task-form";
import { api } from "@/lib/api";

function toDatetimeLocal(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditTaskPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [task, setTask] = useState(null);
  const [form, setForm] = useState(createEmptyTaskForm());

  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [contextType, setContextType] = useState("lead");

  useEffect(() => {
    let alive = true;

    async function loadTask() {
      try {
        setLoading(true);
        setError("");

        const res = await api(`/tasks/${id}`);
        if (!alive) return;

        const nextTask = res?.task ?? res;
        setTask(nextTask);

        const nextContextType = nextTask?.job_id ? "job" : "lead";
        setContextType(nextContextType);

        setForm(
          createEmptyTaskForm({
            lead_id: nextTask?.lead_id ? String(nextTask.lead_id) : "",
            job_id: nextTask?.job_id ? String(nextTask.job_id) : "",
            title: nextTask?.title || "",
            description: nextTask?.description || "",
            due_date: toDatetimeLocal(nextTask?.due_date),
            status: nextTask?.status || "Pending",
          }),
        );
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load task");
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

    async function loadJobs() {
      try {
        setLoadingJobs(true);
        const res = await api("/jobs?limit=200&offset=0");
        if (!alive) return;
        setJobs(res?.jobs || []);
      } catch (e) {
        if (!alive) return;
        setError((prev) => prev || e?.message || "Failed to load jobs");
      } finally {
        if (!alive) return;
        setLoadingJobs(false);
      }
    }

    if (id) {
      loadTask();
      loadLeads();
      loadJobs();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      lead_id: contextType === "lead" ? Number(form.lead_id) : null,
      job_id: contextType === "job" ? Number(form.job_id) : null,
    };

    try {
      setSaving(true);

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push(`/tasks/${id}`);
    } catch (e) {
      setError(e?.message || "Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={`Edit Task #${id}`}>
      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : !task ? (
        <div className="text-muted text-sm">Task not found.</div>
      ) : (
        <section className="card rounded-lg p-4">
          <TaskForm
            form={form}
            onChange={setForm}
            onSubmit={onSubmit}
            saving={saving}
            error={error}
            submitLabel="Save Changes"
            cancelLabel="Cancel"
            onCancel={() => router.push(`/tasks/${id}`)}
            contextType={contextType}
            onContextChange={() => {}}
            leads={leads}
            jobs={jobs}
            loadingLeads={loadingLeads}
            loadingJobs={loadingJobs}
            isContextLocked={true}
          />
        </section>
      )}
    </AppShell>
  );
}
