"use client";

const ESTIMATE_STATUS_OPTIONS = ["Draft", "Sent", "Approved", "Rejected"];

const EMPTY_ESTIMATE_FORM = {
  job_id: "",
  title: "",
  status: "Draft",
  notes: "",
};

function getJobLabel(job) {
  const title = String(job?.title || "").trim();
  return title || `Job #${job.id}`;
}

export function createEmptyEstimateForm(overrides = {}) {
  return {
    ...EMPTY_ESTIMATE_FORM,
    ...overrides,
  };
}

export function EstimateForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create Estimate",
  cancelLabel,
  onCancel,
  jobs = [],
  loadingJobs = false,
  layout = "default", // default | compact
  isContextLocked = false,
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
          <label className="text-muted text-xs">Job *</label>
          <select
            className="input mt-1"
            value={form.job_id}
            onChange={(e) => setField("job_id", e.target.value)}
            disabled={loadingJobs || saving || isContextLocked}
            required
          >
            <option value="">
              {loadingJobs
                ? "Loading jobs..."
                : jobs.length
                  ? "Select a job..."
                  : "No jobs available"}
            </option>

            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {getJobLabel(job)}
              </option>
            ))}
          </select>
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Title *</label>
          <input
            className="input mt-1"
            placeholder="Example: Roof replacement estimate"
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
            disabled={saving}
          >
            {ESTIMATE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Notes</label>
          <textarea
            className="input mt-1 min-h-[120px]"
            placeholder="Add internal notes or estimate context..."
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving || loadingJobs} className="btn">
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
