"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];

function leadToForm(lead) {
  return {
    first_name: lead?.first_name ?? "",
    last_name: lead?.last_name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: lead?.source ?? "",
    status: lead?.status ?? "New",
    budget_min: lead?.budget_min != null ? String(lead.budget_min) : "",
    budget_max: lead?.budget_max != null ? String(lead.budget_max) : "",
    notes: lead?.notes ?? "",
  };
}

export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    source: "",
    status: "New",
    budget_min: "",
    budget_max: "",
    notes: "",
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Load existing lead + prefill
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await api(`/leads/${id}`);
        const lead = res?.lead ?? res;

        if (!alive) return;

        if (!lead) {
          setError("Lead not found.");
          return;
        }

        setForm(leadToForm(lead));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load lead");
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

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }

    // Convert budgets to numbers or null (so backend/DB is happy)
    const payload = {
      ...form,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source.trim() || null,
      notes: form.notes.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
    };

    try {
      setSaving(true);

      await api(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push(`/leads/${id}`);
      router.refresh?.();
    } catch (e2) {
      setError(e2?.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={`Edit Lead #${id}`}>
      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <section className="bg-surface border-base rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-muted text-xs">First name *</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                />
              </div>

              <div>
                <label className="text-muted text-xs">Last name *</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                />
              </div>

              <div>
                <label className="text-muted text-xs">Email</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  inputMode="email"
                />
              </div>

              <div>
                <label className="text-muted text-xs">Phone</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="text-muted text-xs">Source</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Referral, Website, Open House..."
                  value={form.source}
                  onChange={(e) => setField("source", e.target.value)}
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
                <label className="text-muted text-xs">Budget min</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.budget_min}
                  onChange={(e) => setField("budget_min", e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 250000"
                />
              </div>

              <div>
                <label className="text-muted text-xs">Budget max</label>
                <input
                  className="border-base bg-app mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.budget_max}
                  onChange={(e) => setField("budget_max", e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 400000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-muted text-xs">Notes</label>
                <textarea
                  className="border-base bg-app mt-1 min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Motivation, timeline, preferences..."
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
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-4 py-2 text-sm"
              onClick={() => router.push(`/leads/${id}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
