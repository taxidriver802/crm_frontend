"use client";

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
      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <div>
          <label className="text-muted text-xs">First name *</label>
          <input
            className="input mt-1"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
          />
        </div>

        <div>
          <label className="text-muted text-xs">Last name *</label>
          <input
            className="input mt-1"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
          />
        </div>

        <div>
          <label className="text-muted text-xs">Email</label>
          <input
            className="input mt-1"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            inputMode="email"
          />
        </div>

        <div>
          <label className="text-muted text-xs">Phone</label>
          <input
            className="input mt-1"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>

        <div>
          <label className="text-muted text-xs">Source</label>
          <input
            className="input mt-1"
            placeholder="Referral, Website, Open House..."
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
          />
        </div>

        <div>
          <label className="text-muted text-xs">Status</label>
          <select
            className="input mt-1"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-muted text-xs">Budget min</label>
          <input
            className="input mt-1"
            value={form.budget_min}
            onChange={(e) => setField("budget_min", e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 250000"
          />
        </div>

        <div>
          <label className="text-muted text-xs">Budget max</label>
          <input
            className="input mt-1"
            value={form.budget_max}
            onChange={(e) => setField("budget_max", e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 400000"
          />
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Notes</label>
          <textarea
            className="input mt-1 min-h-[120px]"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Motivation, timeline, preferences..."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
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