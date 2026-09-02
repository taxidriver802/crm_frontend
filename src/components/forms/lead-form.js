"use client";

import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  source: "",
  status: "New",
  budget_min: "",
  budget_max: "",
  notes: "",
};

export function createEmptyLeadForm() {
  return { ...EMPTY_FORM };
}

export function LeadForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create lead",
  cancelLabel,
  onCancel,
  layout = "default", // "default" | "compact"
}) {
  const isCompact = layout === "compact";

  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <Field label="First name" required>
          <input
            className="input"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
          />
        </Field>

        <Field label="Last name" required>
          <input
            className="input"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
          />
        </Field>

        <Field label="Email">
          <input
            className="input"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            inputMode="email"
          />
        </Field>

        <Field label="Phone">
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </Field>

        <Field label="Source">
          <input
            className="input"
            placeholder="Referral, Website, Open House..."
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Budget min">
          <input
            className="input"
            value={form.budget_min}
            onChange={(e) => setField("budget_min", e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 250000"
          />
        </Field>

        <Field label="Budget max">
          <input
            className="input"
            value={form.budget_max}
            onChange={(e) => setField("budget_max", e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 400000"
          />
        </Field>

        <Field
          label="Notes"
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <textarea
            className="input min-h-[120px]"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Motivation, timeline, preferences..."
          />
        </Field>
      </div>

      <FormActions>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>

        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            {cancelLabel || "Cancel"}
          </button>
        ) : null}
      </FormActions>
    </form>
  );
}
