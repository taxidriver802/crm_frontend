"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";

/** Split a free-text name query into first / last for the lead form. */
function splitLeadNamePrefill(value) {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { first_name: "", last_name: "" };
  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function NewLeadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const namePrefill = searchParams.get("name") || searchParams.get("q") || "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() =>
    createEmptyLeadForm(splitLeadNamePrefill(namePrefill)),
  );

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
      service_type: form.service_type?.trim() || null,
      preferred_contact_method: form.preferred_contact_method?.trim() || null,
      urgency: form.urgency?.trim() || null,
      notes: form.notes.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
    };

    try {
      setSaving(true);

      const res = await api("/leads", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newId = res?.lead?.id ?? res?.id;

      if (newId) {
        router.push(`/leads/${newId}`);
      } else {
        router.push("/leads");
      }
    } catch (e) {
      setError(e?.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="New lead">
      <section className="card p-4">
        <LeadForm
          form={form}
          onChange={setForm}
          onSubmit={onSubmit}
          saving={saving}
          error={error}
          submitLabel="Create lead"
          cancelLabel="Cancel"
          onCancel={() => router.back()}
        />
      </section>
    </AppShell>
  );
}

export default function NewLeadPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="New lead">
          <section className="card p-4">
            <p className="text-muted text-sm">Loading…</p>
          </section>
        </AppShell>
      }
    >
      <NewLeadPageInner />
    </Suspense>
  );
}
