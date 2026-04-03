"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["Pending", "Completed"];

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

  const [form, setForm] = useState({
    lead_id: "",
    job_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "Pending",
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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

        setForm({
          lead_id: nextTask?.lead_id ? String(nextTask.lead_id) : "",
          job_id: nextTask?.job_id ? String(nextTask.job_id) : "",
          title: nextTask?.title || "",
          description: nextTask?.description || "",
          due_date: toDatetimeLocal(nextTask?.due_date),
          status: nextTask?.status || "Pending",
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load task");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) {
      loadTask();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  const isLeadTask = !!task?.lead_id;
  const isJobTask = !!task?.job_id;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError("Title is required.");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      lead_id: isLeadTask ? Number(form.lead_id) : null,
      job_id: isJobTask ? Number(form.job_id) : null,
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
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : !task ? (
        <div className="text-muted-foreground text-sm">Task not found.</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <section className="bg-surface border-base rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {/* <label className="text-muted text-xs">Lead *</label>
                <select
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.lead_id}
                  onChange={(e) => setField("lead_id", e.target.value)}
                  disabled={loadingLeads}
                >
                  <option value="">
                    {loadingLeads
                      ? "Loading leads…"
                      : leadOptions.length
                        ? "Select a lead…"
                        : "No leads found"}
                  </option>

                  {leadOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} (#{o.id}){o.status ? ` • ${o.status}` : ""}
                    </option>
                  ))}
                </select> */}

                <div className="sm:col-span-2">
                  <label className="text-muted text-xs">Linked To</label>

                  <div className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm">
                    {isLeadTask && `Lead #${form.lead_id}`}
                    {isJobTask && `Job #${form.job_id}`}
                  </div>

                  <div className="text-muted-foreground mt-1 text-xs">
                    Ownership cannot be changed after creation.
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-muted text-xs">Title *</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Call client, send follow-up, confirm showing..."
                />
              </div>

              <div>
                <label className="text-muted text-xs">Status</label>
                <select
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted text-xs">Due date</label>
                <input
                  type="datetime-local"
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.due_date}
                  onChange={(e) => setField("due_date", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-muted text-xs">Description</label>
                <textarea
                  className="border-base bg-app mt-1 min-h-[140px] w-full rounded-md border px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Notes, next steps, reminders..."
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm"
              onClick={() => router.push(`/tasks/${id}`)}
            >
              Cancel
            </button>

            <Link
              href="/tasks"
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm"
            >
              Back to tasks
            </Link>
          </div>
        </form>
      )}
    </AppShell>
  );
}
