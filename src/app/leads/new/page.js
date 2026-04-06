"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeadForm, createEmptyLeadForm } from "@/components/forms/lead-form";
import { api } from "@/lib/api";

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createEmptyLeadForm());

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
    <AppShell title="New Lead">
      <section className="card rounded-lg p-4">
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
