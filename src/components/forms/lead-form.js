"use client";

import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];
const SOURCE_OPTIONS = [
  "Referral",
  "Website",
  "Repeat customer",
  "Door knock",
  "Other",
];
const SERVICE_OPTIONS = [
  "Inspection",
  "Repair",
  "Replacement",
  "Gutters",
  "Maintenance",
];
const CONTACT_OPTIONS = ["Call", "Text", "Email"];
const URGENCY_OPTIONS = ["Low", "Normal", "Urgent"];

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
  service_type: "",
  preferred_contact_method: "",
  urgency: "",
};

function withCurrentValue(options, value) {
  if (value && !options.includes(value)) {
    return [value, ...options];
  }
  return options;
}

export function createEmptyLeadForm(overrides = {}) {
  return { ...EMPTY_FORM, ...overrides };
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
          <select
            className="input"
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(SOURCE_OPTIONS, form.source).map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
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

        <Field label="Service">
          <select
            className="input"
            value={form.service_type || ""}
            onChange={(e) => setField("service_type", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(SERVICE_OPTIONS, form.service_type).map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Preferred contact">
          <select
            className="input"
            value={form.preferred_contact_method || ""}
            onChange={(e) => setField("preferred_contact_method", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(CONTACT_OPTIONS, form.preferred_contact_method).map(
              (method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Urgency">
          <select
            className="input"
            value={form.urgency || ""}
            onChange={(e) => setField("urgency", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(URGENCY_OPTIONS, form.urgency).map((urgency) => (
              <option key={urgency} value={urgency}>
                {urgency}
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
