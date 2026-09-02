"use client";

import { Alert } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import {
  buildFileUrl,
  formatBytes,
  formatDate,
  formatDateTime,
  API_BASE,
  isPreviewableFile,
} from "@/lib/helper";

import { ToggleFormSection } from "@/components/toggle-form-section";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { TaskForm, createEmptyTaskForm } from "@/components/forms/task-form";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ActivityList } from "@/components/activity-list";
import { NotesSection } from "@/components/notes-section";
import { PhotoGallery } from "@/components/photo-gallery";
import {
  LoadingSpinner,
  SectionSkeleton,
  Skeleton,
} from "@/components/loading/loadingSkeletons";
import { SectionCard } from "@/components/ui/section-card";
import { PageError } from "@/components/error-boundary";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetaList, MetaItem } from "@/components/ui/meta";
import { Field, FormActions } from "@/components/ui/field";
import { EmptyState } from "@/components/error-boundary";

const JOB_STATUSES = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
];

const DEFAULT_VISIBLE_TASKS = 6;

function JobStatusBadge({ status }) {
  return <StatusBadge kind="job" status={status || "—"} />;
}

export default function JobDetailPage() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);

  const [showAllTasks, setShowAllTasks] = useState(false);

  const [lead, setLead] = useState(null);
  const [loadingLead, setLoadingLead] = useState(false);
  const [leadError, setLeadError] = useState("");

  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [estimates, setEstimates] = useState([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [estimatesError, setEstimatesError] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoicesError, setInvoicesError] = useState("");

  const [measurements, setMeasurements] = useState([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);
  const [measurementsError, setMeasurementsError] = useState("");
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [notesLoadState, setNotesLoadState] = useState({ ready: false, empty: true });
  const [measurementForm, setMeasurementForm] = useState({
    label: "",
    value: "",
    unit: "",
  });
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  const [limit, setLimit] = useState(50);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);

  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(
    createEmptyTaskForm({
      job_id: String(id),
      status: "Pending",
    }),
  );

  const [previewFile, setPreviewFile] = useState(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalHint, setPortalHint] = useState("");

  useEffect(() => {
    if (!id) return;

    setTaskForm((prev) => ({
      ...prev,
      job_id: String(id),
    }));
  }, [id]);

  const [miniLoadingActivity, setMiniLoadingActivity] = useState(false);

  async function loadJob() {
    const data = await api(`/jobs/${id}`);
    setJob(data.job);
  }

  async function loadActivity({ append = false } = {}) {
    if (!append) {
      setLoadingActivity(true);
    } else {
      setMiniLoadingActivity(true);
    }

    try {
      const res = await api(`/jobs/${id}/activity?limit=${limit}`);
      const newActivity = res.activity || [];

      setActivity((prev) => {
        if (!append) return newActivity;

        const existingIds = new Set(prev.map((a) => a.id));
        const merged = [...prev];

        for (const item of newActivity) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }

        return merged;
      });

      setHasMoreActivity(!!res.hasMore);
    } finally {
      setLoadingActivity(false);
      (async () => {
        await new Promise((r) => setTimeout(r, 2500));
        setMiniLoadingActivity(false);
      })();
    }
  }

  async function loadTasks() {
    setLoadingTasks(true);
    try {
      const data = await api(`/jobs/${id}/tasks`);
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e.message || "Failed to load job tasks");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadEstimates() {
    setLoadingEstimates(true);
    setEstimatesError("");

    try {
      const res = await api(`/estimates/job/${id}`);
      setEstimates(res.estimates || []);
    } catch (e) {
      setEstimatesError(e.message || "Failed to load estimates");
    } finally {
      setLoadingEstimates(false);
    }
  }

  async function loadMeasurements() {
    setLoadingMeasurements(true);
    setMeasurementsError("");

    try {
      const res = await api(`/jobs/${id}/measurements`);
      setMeasurements(res.measurements || []);
    } catch (e) {
      setMeasurementsError(e.message || "Failed to load measurements");
    } finally {
      setLoadingMeasurements(false);
    }
  }

  async function loadInvoices() {
    setLoadingInvoices(true);
    setInvoicesError("");
    try {
      const res = await api(`/invoices/job/${id}`);
      setInvoices(res.invoices || []);
    } catch (e) {
      setInvoicesError(e.message || "Failed to load invoices");
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function loadFiles() {
    try {
      setLoadingFiles(true);
      const res = await api(`/files?job_id=${id}`);
      setFiles(res.files || []);
    } catch (e) {
      setFilesError(e.message || "Failed to load files");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadJob(),
        loadTasks(),
        loadFiles(),
        loadActivity(),
        loadEstimates(),
        loadMeasurements(),
        loadInvoices(),
      ]);
    } catch (e) {
      setError(e.message || "Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  async function updateJobStatus(newStatus, nextIndex) {
    if (!job || newStatus === job.status) return;

    const currentIndex = JOB_STATUSES.indexOf(job.status ?? "New");
    const isTooFarAhead = nextIndex > currentIndex + 1;

    if (isTooFarAhead) return;

    const previous = job.status;

    setError(null);
    setJob((prev) => ({ ...prev, status: newStatus }));
    setUpdatingStatus(newStatus);

    try {
      await api(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await loadActivity();
    } catch (e) {
      setJob((prev) => ({ ...prev, status: previous }));
      setError(e.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleSaveMeasurement(e) {
    e.preventDefault();
    if (!measurementForm.label.trim()) {
      setMeasurementsError("Label is required.");
      return;
    }
    const value = Number(measurementForm.value);
    if (!Number.isFinite(value)) {
      setMeasurementsError("Value must be a number.");
      return;
    }

    setSavingMeasurement(true);
    setMeasurementsError("");

    try {
      const payload = {
        label: measurementForm.label.trim(),
        value,
        unit: measurementForm.unit.trim(),
      };

      if (editingMeasurement) {
        await api(`/jobs/${id}/measurements/${editingMeasurement.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/jobs/${id}/measurements`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setMeasurementForm({ label: "", value: "", unit: "" });
      setEditingMeasurement(null);
      setMeasurementOpen(false);
      await loadMeasurements();
    } catch (err) {
      setMeasurementsError(err.message || "Could not save measurement");
    } finally {
      setSavingMeasurement(false);
    }
  }

  function startEditMeasurement(m) {
    setEditingMeasurement(m);
    setMeasurementForm({
      label: m.label || "",
      value: String(m.value ?? ""),
      unit: m.unit || "",
    });
    setMeasurementOpen(true);
    setMeasurementsError("");
  }

  async function handleDeleteMeasurement(m) {
    const ok = window.confirm("Delete this measurement?");
    if (!ok) return;
    setMeasurementsError("");
    try {
      await api(`/jobs/${id}/measurements/${m.id}`, { method: "DELETE" });
      await loadMeasurements();
      if (editingMeasurement?.id === m.id) {
        setEditingMeasurement(null);
        setMeasurementForm({ label: "", value: "", unit: "" });
      }
    } catch (err) {
      setMeasurementsError(err.message || "Could not delete");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreatingTask(true);
    setError(null);

    try {
      if (!taskForm.title.trim()) {
        throw new Error("Title is required.");
      }

      const payload = {
        job_id: Number(id),
        lead_id: null,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
        status: taskForm.status || "Pending",
      };

      const data = await api("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((prev) => [data.task, ...prev]);
      setTaskForm(
        createEmptyTaskForm({
          job_id: String(id),
          status: "Pending",
        }),
      );

      await loadActivity();
      setIsTaskFormOpen(false);
    } catch (e) {
      setError(e.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleToggleTaskStatus(task) {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    const previousTasks = tasks;

    setError(null);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );

    try {
      await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadActivity();
    } catch (e) {
      setTasks(previousTasks);
      setError(e.message || "Failed to update task");
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFilesError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_id", String(id));

      const res = await fetch(`${API_BASE}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      await loadFiles();
      await loadActivity();
    } catch (e) {
      setFilesError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId) {
    const confirmed = window.confirm("Delete this file?");
    if (!confirmed) return;

    setBusyFileId(fileId);
    setFilesError("");

    try {
      await api(`/files/${fileId}`, {
        method: "DELETE",
      });

      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      await loadActivity();
    } catch (e) {
      console.error(e);
      setFilesError(e?.message || "Failed to delete file");
    } finally {
      setBusyFileId(null);
    }
  }

  async function handleGeneratePortalLink() {
    setPortalBusy(true);
    setPortalHint("");
    try {
      const res = await api(`/portal/generate/${id}`, { method: "POST" });
      const url = `${window.location.origin}/public/portal/${res.token}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setPortalHint("Customer portal link copied to clipboard.");
      } else {
        setPortalHint(url);
      }
    } catch (e) {
      setPortalHint(e?.message || "Failed to generate portal link");
    } finally {
      setPortalBusy(false);
    }
  }

  const canManageFiles = currentUser?.role === "owner" || currentUser?.role === "admin";

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      if (!job?.lead_id) {
        setLead(null);
        setLeadError("");
        return;
      }

      try {
        setLoadingLead(true);
        setLeadError("");

        const res = await api(`/leads/${job.lead_id}`);
        if (cancelled) return;

        setLead(res?.lead ?? res ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load related lead", e);
        setLead(null);
        setLeadError(e?.message || "Failed to load related lead");
      } finally {
        if (!cancelled) setLoadingLead(false);
      }
    }

    loadLead();

    return () => {
      cancelled = true;
    };
  }, [job?.lead_id]);

  useEffect(() => {
    let alive = true;

    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setCurrentUser(data.user || null);
      } catch (e) {
        console.error(e);
      }
    }

    if (id) {
      loadCurrentUser();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (limit === 50) return;

    loadActivity({ append: true });
  }, [limit, id]);
  const sortedTasks = [...tasks].sort((a, b) => {
    const aCompleted = a.status === "Completed";
    const bCompleted = b.status === "Completed";

    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;

    return aTime - bTime;
  });

  const formatCurrency = (num) => {
    return Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const visibleTasks = showAllTasks
    ? sortedTasks
    : sortedTasks.slice(0, DEFAULT_VISIBLE_TASKS);

  const hiddenTaskCount = Math.max(0, sortedTasks.length - visibleTasks.length);
  const sortedEstimates = [...estimates].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  );

  const isInitialLoading = loading && !job;

  return (
    <AppShell title={job ? job.title : "Job"}>
      <div className="space-y-6">
        {isInitialLoading ? (
          <div className="space-y-6">
            <div className="card space-y-3 p-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-16 w-full" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="card space-y-3 p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>

                <div className="card space-y-3 p-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="card space-y-3 p-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="card space-y-3 p-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <PageError message={error} /> : null}

        {!isInitialLoading && job ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SectionCard size="lg" title="Job Overview" description="Overview and current status">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {job.lead_id ? (
                        <div className="text-sm">
                          <span className="text-muted">Lead: </span>
                          <Link
                            href={`/leads/${job.lead_id}`}
                            className="underline underline-offset-4 hover:opacity-80"
                          >
                            {lead
                              ? `${lead.first_name} ${lead.last_name}`
                              : `Lead #${job.lead_id}`}
                          </Link>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      <button
                        type="button"
                        className="btn px-3 py-2 text-xs"
                        onClick={handleGeneratePortalLink}
                        disabled={portalBusy}
                      >
                        {portalBusy ? "Link…" : "Customer Portal"}
                      </button>
                      <Link href={`/jobs/${id}/edit`} className="btn px-3 py-2 text-xs">
                        Edit
                      </Link>
                    </div>
                  </div>

                  {portalHint ? (
                    <div className="text-muted text-sm">{portalHint}</div>
                  ) : null}

                  <div className="border-base border-t pt-4">
                    <p className="text-muted text-sm leading-6">
                      {job.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <CollapsibleSection
                title="Notes"
                description="Capture conversations and decisions for this job."
                syncKey={id}
                ready={notesLoadState.ready}
                empty={notesLoadState.empty}
              >
                <NotesSection
                  entityType="job"
                  entityId={id}
                  onLoadState={setNotesLoadState}
                />
              </CollapsibleSection>

              <SectionCard size="lg"
                title="Pipeline"
                description="Track where this job is in the workflow"
              >
                <div className="flex flex-wrap items-center gap-y-3">
                  {JOB_STATUSES.map((status, index) => {
                    const currentIndex = JOB_STATUSES.indexOf(job.status ?? "New");
                    const isActive = status === job.status;
                    const isCompleted = index < currentIndex;
                    const isTooFarAhead = index > currentIndex + 1;
                    const isLocked = updatingStatus !== null || isTooFarAhead || isActive;

                    return (
                      <div key={status} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => updateJobStatus(status, index)}
                          disabled={isLocked}
                          className={[
                            "choice-chip",
                            isActive && "choice-chip-active",
                            isCompleted && !isActive && "choice-chip-done",
                            isTooFarAhead && "opacity-50",
                            updatingStatus === status && "opacity-60",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {status}
                        </button>

                        {index < JOB_STATUSES.length - 1 && (
                          <div
                            className={[
                              "pipeline-rail",
                              index < currentIndex ? "pipeline-rail-done" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
              <CollapsibleSection
                title="Estimates"
                description="Pricing and scope tied to this job"
                syncKey={id}
                ready={!loadingEstimates}
                empty={estimates.length === 0}
                actions={
                  <Link
                    href={`/estimates/new?job_id=${id}`}
                    className="btn px-3 py-2 text-xs"
                  >
                    + New Estimate
                  </Link>
                }
              >
                {!isInitialLoading && loadingEstimates ? (
                  <SectionSkeleton rows={3} />
                ) : estimatesError ? (
                  <Alert variant="inline">{estimatesError}</Alert>
                ) : estimates.length === 0 ? (
                  <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                    No estimates for this job yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedEstimates.map((estimate) => (
                      <Link
                        key={estimate.id}
                        href={`/estimates/${estimate.id}`}
                        className="hover:bg-accent flex items-start justify-between gap-3 rounded-lg border p-4 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{estimate.title}</div>

                          <div className="text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span>
                              {formatDate(estimate.updated_at || estimate.created_at)}
                            </span>

                            {estimate.job?.address ? (
                              <>
                                <span>•</span>
                                <span className="truncate">{estimate.job.address}</span>
                              </>
                            ) : null}
                          </div>

                          {estimate.notes ? (
                            <div className="text-muted mt-2 line-clamp-2 text-sm">
                              {estimate.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <StatusBadge kind="estimate" status={estimate.status} />
                          <div className="text-sm font-semibold">
                            $
                            {formatCurrency(Number(estimate.grand_total || 0).toFixed(2))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Invoices"
                description="Billing tied to this job"
                syncKey={id}
                ready={!loadingInvoices}
                empty={invoices.length === 0}
                actions={
                  <Link
                    href={`/invoices/new?job_id=${id}`}
                    className="btn px-3 py-2 text-xs"
                  >
                    + New Invoice
                  </Link>
                }
              >
                {!isInitialLoading && loadingInvoices ? (
                  <SectionSkeleton rows={3} />
                ) : invoicesError ? (
                  <Alert variant="inline">{invoicesError}</Alert>
                ) : invoices.length === 0 ? (
                  <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                    No invoices for this job yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...invoices]
                      .sort(
                        (a, b) =>
                          new Date(b.updated_at || b.created_at) -
                          new Date(a.updated_at || a.created_at),
                      )
                      .map((inv) => (
                        <Link
                          key={inv.id}
                          href={`/invoices/${inv.id}`}
                          className="hover:bg-accent flex items-start justify-between gap-3 rounded-lg border p-4 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{inv.invoice_number}</div>
                            <div className="text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span>{formatDate(inv.updated_at || inv.created_at)}</span>
                              {inv.due_date ? (
                                <>
                                  <span>•</span>
                                  <span>Due {formatDate(inv.due_date)}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <StatusBadge kind="invoice" status={inv.status} />
                            <div className="text-sm font-semibold">
                              ${formatCurrency(Number(inv.grand_total || 0).toFixed(2))}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Measurements"
                description="Manual job dimensions for pricing context (optional)"
                syncKey={id}
                ready={!loadingMeasurements}
                empty={measurements.length === 0}
                actions={
                  <button
                    type="button"
                    className="btn px-3 py-2 text-xs"
                    onClick={() => {
                      if (measurementOpen) {
                        setMeasurementOpen(false);
                        setEditingMeasurement(null);
                        setMeasurementForm({ label: "", value: "", unit: "" });
                      } else {
                        setMeasurementOpen(true);
                        setEditingMeasurement(null);
                        setMeasurementForm({ label: "", value: "", unit: "" });
                      }
                      setMeasurementsError("");
                    }}
                  >
                    {measurementOpen ? "Close" : "+ Add"}
                  </button>
                }
              >
                {measurementsError ? (
                  <Alert variant="inline">{measurementsError}</Alert>
                ) : null}

                {!isInitialLoading && loadingMeasurements ? (
                  <SectionSkeleton rows={2} />
                ) : measurements.length === 0 && !measurementOpen ? (
                  <EmptyState
                    title="No measurements yet"
                    description="Add roof areas, pitch, or other fields you use when quoting."
                  />
                ) : null}

                {measurementOpen ? (
                  <form
                    onSubmit={handleSaveMeasurement}
                    className="list-row list-row-muted mb-4 space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Label">
                        <input
                          className="input"
                          value={measurementForm.label}
                          onChange={(e) =>
                            setMeasurementForm((f) => ({ ...f, label: e.target.value }))
                          }
                          placeholder="e.g. Main roof area"
                        />
                      </Field>
                      <Field label="Value">
                        <input
                          className="input"
                          value={measurementForm.value}
                          onChange={(e) =>
                            setMeasurementForm((f) => ({ ...f, value: e.target.value }))
                          }
                          placeholder="e.g. 2400"
                        />
                      </Field>
                      <Field label="Unit">
                        <input
                          className="input"
                          value={measurementForm.unit}
                          onChange={(e) =>
                            setMeasurementForm((f) => ({ ...f, unit: e.target.value }))
                          }
                          placeholder="sq ft"
                        />
                      </Field>
                    </div>
                    <FormActions>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={savingMeasurement}
                      >
                        {editingMeasurement ? "Update" : "Save"}
                      </button>
                      {editingMeasurement ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingMeasurement(null);
                            setMeasurementForm({ label: "", value: "", unit: "" });
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </FormActions>
                  </form>
                ) : null}

                {measurements.length > 0 ? (
                  <div className="space-y-2">
                    {measurements.map((m) => (
                      <div
                        key={m.id}
                        className="list-row list-row-interactive flex items-start justify-between gap-3"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => startEditMeasurement(m)}
                        >
                          <div className="font-medium">{m.label}</div>
                          <div className="text-muted mt-1 text-sm">
                            {m.value} {m.unit || ""}
                          </div>
                        </button>
                        <button
                          type="button"
                          className="text-muted text-xs underline"
                          onClick={() => handleDeleteMeasurement(m)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CollapsibleSection>

              <CollapsibleSection
                title="Tasks"
                description="Create and manage tasks tied directly to this job"
                syncKey={id}
                ready={!loadingTasks}
                empty={tasks.length === 0}
              >
                <div className="space-y-4">
                  <ToggleFormSection
                    title="Tasks"
                    description="Create and manage tasks tied directly to this job"
                    isOpen={isTaskFormOpen}
                    onToggle={() => setIsTaskFormOpen((open) => !open)}
                    openLabel="+ New Task"
                    closeLabel="Hide Task Form"
                    fullFormUrl={`/tasks/new?job_id=${id}`}
                  >
                    <TaskForm
                      form={taskForm}
                      onChange={setTaskForm}
                      onSubmit={handleCreateTask}
                      saving={creatingTask}
                      error=""
                      submitLabel="Create task"
                      cancelLabel="Clear"
                      onCancel={() =>
                        setTaskForm(
                          createEmptyTaskForm({
                            job_id: String(id),
                            status: "Pending",
                          }),
                        )
                      }
                      contextType="job"
                      leads={[]}
                      jobs={[{ id: String(id), title: job?.title || `Job #${id}` }]}
                      loadingLeads={false}
                      loadingJobs={false}
                      isContextLocked={true}
                      layout="compact"
                    />
                  </ToggleFormSection>

                  {!loadingTasks && tasks.length > DEFAULT_VISIBLE_TASKS ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-muted text-xs">
                        Showing {visibleTasks.length} of {sortedTasks.length} tasks
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowAllTasks((prev) => !prev)}
                        className="btn px-3 py-1.5 text-xs"
                      >
                        {showAllTasks
                          ? "Show fewer"
                          : `Show all tasks${hiddenTaskCount > 0 ? ` (${hiddenTaskCount} more)` : ""}`}
                      </button>
                    </div>
                  ) : null}

                  {!isInitialLoading && loadingTasks ? (
                    <SectionSkeleton rows={4} />
                  ) : tasks.length === 0 ? (
                    <EmptyState title="No tasks for this job yet" />
                  ) : (
                    <div className="space-y-3">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          className="list-row list-row-muted flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="block hover:opacity-80"
                            >
                              <div className="font-medium underline underline-offset-4">
                                {task.title}
                              </div>

                              {task.description ? (
                                <div className="text-muted mt-1 text-sm">
                                  {task.description}
                                </div>
                              ) : null}

                              <div className="text-muted mt-2 text-xs">
                                Due: {formatDateTime(task.due_date)}
                              </div>
                            </Link>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <StatusBadge kind="task" status={task.status} />

                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(task)}
                              className="btn px-3 py-2 text-xs"
                            >
                              {task.status === "Completed"
                                ? "Mark pending"
                                : "Mark completed"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>

            <div className="space-y-6">
              <SectionCard size="lg" title="Details">
                <MetaList>
                  <MetaItem label="Address">{job.address || "—"}</MetaItem>
                  <MetaItem label="Current status">{job.status}</MetaItem>
                  <MetaItem label="Created">{formatDate(job.created_at)}</MetaItem>
                </MetaList>
              </SectionCard>

              <section className="card transition hover:bg-accent">
                <Link href={`/leads/${job.lead_id}`} className="block p-4">
                  <div className="mb-3">
                    <h2 className="section-heading">Lead Snapshot</h2>
                    <p className="text-muted mt-1 text-sm">
                      Quick context for the lead tied to this job.
                    </p>
                  </div>

                  {!job?.lead_id ? (
                    <div className="text-muted text-sm">No lead linked to this job.</div>
                  ) : !isInitialLoading && loadingLead ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-52" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                    </div>
                  ) : leadError ? (
                    <Alert variant="inline">{leadError}</Alert>
                  ) : !lead ? (
                    <div className="text-muted text-sm">Lead details unavailable.</div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <MetaItem label="Name">
                        <span className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </span>
                      </MetaItem>

                      <MetaItem label="Contact">
                        {lead.email || "—"}
                        {lead.phone ? ` • ${lead.phone}` : ""}
                      </MetaItem>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <StatusBadge kind="lead" status={lead.status ?? "—"} />

                        {lead.source ? (
                          <StatusBadge>Source: {lead.source}</StatusBadge>
                        ) : null}
                      </div>

                      {lead.notes ? (
                        <MetaItem label="Notes">
                          <span className="whitespace-pre-wrap">{lead.notes}</span>
                        </MetaItem>
                      ) : null}
                    </div>
                  )}
                </Link>
              </section>

              <SectionCard size="lg"
                title="Attached Files"
                description="Files uploaded directly to this job."
                right={
                  canManageFiles ? (
                    <label className="btn cursor-pointer px-3 py-2 text-xs">
                      {uploading ? "Uploading…" : "Upload file"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  ) : null
                }
              >
                {filesError ? (
                  <Alert variant="inline" className="mb-3">{filesError}</Alert>
                ) : null}

                {!isInitialLoading && loadingFiles ? (
                  <SectionSkeleton rows={3} />
                ) : files.length === 0 ? (
                  <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                    No files attached to this job yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="list-row flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{file.original_name}</div>
                          <div className="text-muted mt-1 text-xs">
                            {file.mime_type || "Unknown type"} •{" "}
                            {formatBytes(file.size_bytes)}
                          </div>
                          <div className="text-muted mt-1 text-xs">
                            Uploaded: {formatDate(file.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isPreviewableFile(file) ? (
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="btn px-3 py-1.5 text-xs"
                            >
                              Preview
                            </button>
                          ) : (
                            <a
                              href={buildFileUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn px-3 py-1.5 text-xs"
                            >
                              Open
                            </a>
                          )}

                          {canManageFiles ? (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={busyFileId === file.id}
                              className="btn btn-danger px-3 py-1.5 text-xs"
                            >
                              {busyFileId === file.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard size="lg"
                title="Photo Gallery"
                description="Quick visual scan of photos attached to this job."
              >
                <PhotoGallery
                  files={files}
                  loading={loadingFiles && files.length === 0}
                />
              </SectionCard>
              <CollapsibleSection
                title="Activity"
                description="Recent changes and actions on this job"
                syncKey={id}
                ready={!loadingActivity}
                empty={activity.length === 0}
              >
                {!isInitialLoading && loadingActivity ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-60" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : activity.length === 0 ? (
                  <div className="text-muted text-sm">No activity yet.</div>
                ) : (
                  <>
                    <ActivityList activity={activity} loading={loadingActivity} />

                    {hasMoreActivity ? (
                      <div className="mt-3 flex justify-between">
                        <button
                          type="button"
                          className="btn ml-auto px-3 text-xs"
                          onClick={() => setLimit((prev) => prev + 50)}
                        >
                          {miniLoadingActivity ? (
                            <div className="flex flex-row gap-4 px-3">
                              <LoadingSpinner size={14} />
                              Loading
                            </div>
                          ) : (
                            "Load more activity"
                          )}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </CollapsibleSection>
            </div>
          </div>
        ) : null}
      </div>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </AppShell>
  );
}
