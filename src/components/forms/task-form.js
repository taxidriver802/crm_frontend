"use client";

const STATUS_OPTIONS = ["Pending", "Completed"];

const EMPTY_TASK_FORM = {
  lead_id: "",
  job_id: "",
  title: "",
  description: "",
  due_date: "",
  status: "Pending",
};

export function createEmptyTaskForm(overrides = {}) {
  return {
    ...EMPTY_TASK_FORM,
    ...overrides,
  };
}

function getLeadOptionLabel(lead) {
  const name =
    `${(lead.first_name || "").trim()} ${(lead.last_name || "").trim()}`.trim() ||
    `Lead #${lead.id}`;

  return lead.status ? `${name} (#${lead.id}) • ${lead.status}` : `${name} (#${lead.id})`;
}

function getJobOptionLabel(job) {
  return job.title || `Job #${job.id}`;
}

export function TaskForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create task",
  cancelLabel,
  onCancel,
  contextType,
  onContextChange,
  leads = [],
  jobs = [],
  loadingLeads = false,
  loadingJobs = false,
  isContextLocked = false,
  layout = "default", // default | compact
}) {
  const isCompact = layout === "compact";

  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      {!isContextLocked ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onContextChange?.("lead")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              contextType === "lead" ? "bg-accent border-base border" : "hover:bg-accent"
            }`}
          >
            Lead
          </button>

          <button
            type="button"
            onClick={() => onContextChange?.("job")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              contextType === "job" ? "bg-accent border-base border" : "hover:bg-accent"
            }`}
          >
            Job
          </button>
        </div>
      ) : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          {contextType === "lead" ? (
            <>
              <label className="text-muted text-xs">Lead *</label>
              <select
                className="input mt-1"
                value={form.lead_id}
                onChange={(e) => setField("lead_id", e.target.value)}
                disabled={loadingLeads || saving || isContextLocked}
              >
                <option value="">
                  {loadingLeads
                    ? "Loading leads…"
                    : leads.length
                      ? "Select a lead…"
                      : "No leads found"}
                </option>

                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {getLeadOptionLabel(lead)}
                  </option>
                ))}
              </select>

              <div className="text-muted mt-1 text-xs">
                {leads.length
                  ? "Pick the lead this task belongs to."
                  : "Create a lead first, then come back to create tasks."}
              </div>
            </>
          ) : (
            <>
              <label className="text-muted text-xs">Job *</label>
              <select
                className="input mt-1"
                value={form.job_id}
                onChange={(e) => setField("job_id", e.target.value)}
                disabled={loadingJobs || saving || isContextLocked}
              >
                <option value="">
                  {loadingJobs
                    ? "Loading jobs…"
                    : jobs.length
                      ? "Select a job…"
                      : "No jobs found"}
                </option>

                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {getJobOptionLabel(job)}
                  </option>
                ))}
              </select>

              <div className="text-muted mt-1 text-xs">
                {jobs.length
                  ? "Select the job this task belongs to."
                  : "Create a job first, then come back to create tasks."}
              </div>
            </>
          )}
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
          <label className="text-muted text-xs">Due date</label>
          <input
            type="datetime-local"
            className="input mt-1"
            value={form.due_date}
            onChange={(e) => setField("due_date", e.target.value)}
          />
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Title *</label>
          <input
            className="input mt-1"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. Call about showing"
            required
          />
        </div>

        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <label className="text-muted text-xs">Description</label>
          <textarea
            className="input mt-1 min-h-[120px]"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Extra context, talking points, etc."
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
