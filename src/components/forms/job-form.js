"use client";

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
  submitLabel = "Create Job",
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
      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Lead *</label>
          <select
            className="input mt-1"
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
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Title *</label>
          <input
            className="input mt-1"
            placeholder="Example: Roof inspection for 123 Main St"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-muted text-xs">Status</label>
          <select
            className="input mt-1"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {JOB_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-muted text-xs">Address</label>
          <input
            className="input mt-1"
            placeholder="123 Main St"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Description</label>
          <textarea
            className="input mt-1 min-h-[96px]"
            placeholder="Add any context or notes for this job..."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving || loadingLeads} className="btn">
          {saving ? "Creating..." : submitLabel}
        </button>

        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            {cancelLabel || "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
