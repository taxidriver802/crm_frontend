"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["Pending", "Completed"];

export default function NewTaskPage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillLeadId = params.get("lead_id") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leads, setLeads] = useState([]);

  const [form, setForm] = useState({
    lead_id: prefillLeadId, // string
    title: "",
    description: "",
    due_date: "", // "YYYY-MM-DDTHH:mm"
    status: "Pending",
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Fetch leads for dropdown
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
        // We won't hard-fail the page, but we'll show the error.
        setError(e?.message || "Failed to load leads for dropdown");
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

  // If URL prefill lead_id exists, keep it in sync
  useEffect(() => {
    if (prefillLeadId) {
      setForm((f) => ({ ...f, lead_id: prefillLeadId }));
    }
  }, [prefillLeadId]);

  const leadOptions = useMemo(() => {
    return leads
      .slice()
      .sort((a, b) => {
        const an = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        const bn = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
        return an.localeCompare(bn);
      })
      .map((l) => ({
        id: String(l.id),
        label:
          `${(l.first_name || "").trim()} ${(l.last_name || "").trim()}`.trim() ||
          `Lead #${l.id}`,
        status: l.status,
      }));
  }, [leads]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.lead_id.trim()) return setError("Please choose a lead.");
    if (!form.title.trim()) return setError("Title is required.");

    const payload = {
      lead_id: Number(form.lead_id),
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
    } catch (e2) {
      setError(e2?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="New Task">
      <form onSubmit={onSubmit} className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <section className="bg-surface border-base rounded-lg border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Lead dropdown */}
            <div className="sm:col-span-2">
              <label className="text-muted text-xs">Lead *</label>
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
              </select>

              <div className="text-muted-foreground mt-1 text-xs">
                {leadOptions.length
                  ? "Pick the lead this task belongs to."
                  : "Create a lead first, then come back to create tasks."}
              </div>
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
              <label className="text-muted text-xs">Title *</label>
              <input
                className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Call about showing"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-muted text-xs">Description</label>
              <textarea
                className="border-base bg-app mt-1 min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Extra context, talking points, etc."
              />
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button
            type="submit"
            className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Create task"}
          </button>

          <button
            type="button"
            className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </AppShell>
  );
}
