"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";

function leadToForm(lead) {
  return createEmptyLeadForm({
    first_name: lead?.first_name ?? "",
    last_name: lead?.last_name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: lead?.source ?? "",
    status: lead?.status ?? "New",
    budget_min: lead?.budget_min != null ? String(lead.budget_min) : "",
    budget_max: lead?.budget_max != null ? String(lead.budget_max) : "",
    notes: lead?.notes ?? "",
  });
}

export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createEmptyLeadForm());

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
    } catch (e) {
      setError(e?.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={`Edit Lead #${id}`}>
      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : (
        <section className="card rounded-lg p-4">
          <LeadForm
            form={form}
            onChange={setForm}
            onSubmit={onSubmit}
            saving={saving}
            error={error}
            submitLabel="Save Changes"
            cancelLabel="Cancel"
            onCancel={() => router.push(`/leads/${id}`)}
          />
        </section>
      )}
    </AppShell>
  );
}
