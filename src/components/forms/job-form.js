"use client";

import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";

const JOB_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
];

const EMPTY_JOB_FORM = {
  lead_id: "",
  title: "",
  description: "",
  status: "New",
  address: "",
};

function getLeadLabel(lead) {
  const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  return name || `Lead #${lead.id}`;
}

export function createEmptyJobForm(overrides = {}) {
  return {
    ...EMPTY_JOB_FORM,
    ...overrides,
  };
}

export function JobForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create job",
  cancelLabel,
  onCancel,
  leads = [],
  loadingLeads = false,
  layout = "default", // default | compact
}) {
  const isCompact = layout === "compact";

  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <Field
          label="Lead"
          required
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <select
            className="input"
            value={form.lead_id}
            onChange={(e) => setField("lead_id", e.target.value)}
            disabled={loadingLeads || saving}
            required
          >
            <option value="">
              {loadingLeads
                ? "Loading leads..."
                : leads.length
                  ? "Select a lead..."
                  : "No leads available"}
            </option>

            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {getLeadLabel(lead)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Title"
          required
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <input
            className="input"
            placeholder="Example: Roof inspection for 123 Main St"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            required
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {JOB_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Address">
          <input
            className="input"
            placeholder="123 Main St"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </Field>

        <Field
          label="Description"
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <textarea
            className="input min-h-[96px]"
            placeholder="Add any context or notes for this job..."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </Field>
      </div>

      <FormActions>
        <button type="submit" disabled={saving || loadingLeads} className="btn btn-primary">
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
