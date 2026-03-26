"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["Pending", "Completed"];

function taskToForm(task) {
  return {
    lead_id: task?.lead_id != null ? String(task.lead_id) : "",
    title: task?.title ?? "",
    description: task?.description ?? "",
    due_date: toDatetimeLocal(task?.due_date),
    status: task?.status ?? "Pending",
  };
}

export default function EditTaskPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    lead_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "Pending",
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await api(`/tasks/${id}`);
        const task = res?.task ?? res;

        if (!alive) return;

        if (!task) {
          setError("Task not found.");
          return;
        }

        setForm(taskToForm(task));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load task");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) load();

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
      lead_id: form.lead_id.trim() ? Number(form.lead_id.trim()) : null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      status: form.status,
    };

    try {
      setSaving(true);

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push(`/tasks/${id}`);
      router.refresh?.();
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
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <section className="bg-surface border-base rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-muted text-xs">Title *</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                />
              </div>

              <div>
                <label className="text-muted text-xs">Lead ID</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.lead_id}
                  onChange={(e) => setField("lead_id", e.target.value)}
                  inputMode="numeric"
                  placeholder="Optional"
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

              <div className="sm:col-span-2">
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
