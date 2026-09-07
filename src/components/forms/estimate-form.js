"use client";

import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { Field, FormActions } from "@/components/ui/field";

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
  loadingEstimate = false,
  layout = "default", // default | compact
  isContextLocked = false,
  onDelete = null,
  estimateId,
  children,
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
          label="Job"
          required
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <select
            className="input"
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
        </Field>

        {loadingEstimate ? (
          <>Loading...</>
        ) : (
          <>
            <Field
              label="Title"
              required
              className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
            >
              <input
                className="input"
                placeholder="Example: Roof replacement estimate"
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
                disabled={saving}
              >
                {ESTIMATE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Notes"
              className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
            >
              <textarea
                className="input min-h-[120px]"
                placeholder="Add internal notes or estimate context..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                disabled={saving}
              />
            </Field>
          </>
        )}
      </div>
      {children}
      <div className="flex flex-row justify-between">
        <FormActions>
          <button type="submit" disabled={saving || loadingJobs} className="btn btn-primary">
            {saving
              ? submitLabel == "Create Estimate"
                ? "Creating..."
                : "Updating..."
              : submitLabel}
          </button>

          {onCancel ? (
            <button type="button" className="btn" onClick={onCancel} disabled={saving}>
              {cancelLabel || "Cancel"}
            </button>
          ) : null}
        </FormActions>
        {estimateId ? (
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function EstimateFormSkeleton({ layout = "default", onCancel }) {
  const isCompact = layout === "compact";

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        {/* Job select */}
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Title */}
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Status */}
        <div>
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Notes */}
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
