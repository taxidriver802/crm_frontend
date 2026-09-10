"use client";

import { Alert } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReturnLink } from "@/components/return-to";
import { api } from "@/lib/api";
import {
  buildFileUrl,
  formatBytes,
  formatDate,
  formatDaysInStatus,
  formatTaskSchedule,
  API_BASE,
  isPreviewableFile,
} from "@/lib/helper";

import { useConfirmModal } from "@/components/modals/confirm-modal";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { TaskForm, createEmptyTaskForm, buildTaskApiPayload } from "@/components/forms/task-form";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { ActivityList } from "@/components/activity-list";
import { NotesSection } from "@/components/notes-section";
import {
  buildPortalLinkMessage,
  copyText,
  logOutboundEmailOnJob,
} from "@/lib/message-templates";
import { PhotoGallery } from "@/components/photo-gallery";
import {
  LoadingSpinner,
  SectionSkeleton,
  Skeleton,
} from "@/components/loading/loadingSkeletons";
import { SectionCard } from "@/components/ui/section-card";
import { DetailHeader } from "@/components/ui/detail-header";
import { PageError } from "@/components/error-boundary";
import { StatusBadge } from "@/components/ui/status-badge";
import { HealthBadge } from "@/components/ui/health-badge";
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

const EARLY_JOB_STATUSES = new Set(["New", "Contacted"]);

const DEFAULT_VISIBLE_TASKS = 6;

function JobStatusBadge({ status }) {
  return <StatusBadge kind="job" status={status || "—"} />;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [job, setJob] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
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
  const [updateJobStatusOnSchedule, setUpdateJobStatusOnSchedule] = useState(true);
  const [taskForm, setTaskForm] = useState(
    createEmptyTaskForm({
      job_id: String(id),
      status: "Pending",
    }),
  );

  const [previewFile, setPreviewFile] = useState(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMessageBusy, setPortalMessageBusy] = useState(false);
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

  function handleDeleteMeasurement(m) {
    askConfirm({
      title: "Delete this measurement?",
      confirmLabel: "Delete",
      onConfirm: async () => {
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
      },
    });
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreatingTask(true);
    setError(null);

    try {
      if (!taskForm.title.trim()) {
        throw new Error("Title is required.");
      }

      if (taskForm.kind === "appointment" && !taskForm.due_date) {
        throw new Error("Appointments require a start time.");
      }

      const payload = buildTaskApiPayload(
        { ...taskForm, job_id: String(id) },
        { contextType: "job" },
      );

      const data = await api("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((prev) => [data.task, ...prev]);

      const shouldFlipStatus =
        payload.kind === "appointment" &&
        updateJobStatusOnSchedule &&
        EARLY_JOB_STATUSES.has(job?.status);

      if (shouldFlipStatus) {
        await api(`/jobs/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Appointment Scheduled" }),
        });
        await loadJob();
      }

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

  function openNewTaskForm() {
    setTaskForm(
      createEmptyTaskForm({
        job_id: String(id),
        status: "Pending",
        kind: "task",
      }),
    );
    setIsTaskFormOpen(true);
  }

  function openScheduleAppointmentForm() {
    const canFlip = EARLY_JOB_STATUSES.has(job?.status);
    setUpdateJobStatusOnSchedule(canFlip);
    setTaskForm(
      createEmptyTaskForm({
        job_id: String(id),
        status: "Pending",
        kind: "appointment",
        title: "Site visit",
        location: job?.address || "",
      }),
    );
    setIsTaskFormOpen(true);
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

  async function uploadJobFiles(fileList) {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;

    setUploading(true);
    setFilesError("");

    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("job_id", String(id));

        const res = await fetch(`${API_BASE}/files`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
      }

      await loadFiles();
      await loadActivity();
    } catch (e) {
      setFilesError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileUpload(event) {
    uploadJobFiles(event.target.files);
    event.target.value = "";
  }

  function handleFileDrop(event) {
    event.preventDefault();
    setFileDragOver(false);
    if (!canManageFiles) return;
    uploadJobFiles(event.dataTransfer.files);
  }

  async function saveFileMeta(fileId, updates) {
    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, ...updates } : file)),
    );
    try {
      await api(`/files/${fileId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      setFilesError(e.message || "Failed to update file");
      await loadFiles();
    }
  }

  function handleDeleteFile(fileId) {
    askConfirm({
      title: "Delete this file?",
      description: "This file will be permanently removed.",
      confirmLabel: "Delete",
      onConfirm: async () => {
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
      },
    });
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

  async function handleCopyPortalMessage() {
    setPortalMessageBusy(true);
    setPortalHint("");
    try {
      const res = await api(`/portal/generate/${id}`, { method: "POST" });
      const url = `${window.location.origin}/public/portal/${res.token}`;
      const message = buildPortalLinkMessage({
        first_name: lead?.first_name || "there",
        job_title: job?.title || "your job",
        link: url,
      });
      const copied = await copyText(message);
      try {
        await logOutboundEmailOnJob(id, message);
        setPortalHint(
          copied
            ? "Portal message copied and logged."
            : "Portal message logged. Copy it from the communication log.",
        );
      } catch {
        setPortalHint(
          copied ? "Portal message copied. Could not log communication." : message,
        );
      }
    } catch (e) {
      setPortalHint(e?.message || "Failed to generate portal link");
    } finally {
      setPortalMessageBusy(false);
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
  const leadName = lead
    ? `${lead.first_name} ${lead.last_name}`.trim()
    : job?.lead_id
      ? `Lead #${job.lead_id}`
      : "";
  const daysInStatus = job ? formatDaysInStatus(job.status_changed_at) : "";

  return (
    <AppShell
      title={job ? job.title : "Job"}
      description={job && leadName ? leadName : undefined}
    >
      <div className="min-w-0 space-y-6">
        {isInitialLoading ? (
          <div className="space-y-6">
            <div className="card space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="card space-y-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="card space-y-3 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : null}

        {error ? <PageError message={error} /> : null}

        {!isInitialLoading && job ? (
          <div className="min-w-0 space-y-6">
              <DetailHeader
                subtitle={
                  job.lead_id ? (
                    <>
                      Lead:{" "}
                      <ReturnLink
                        href={`/leads/${job.lead_id}`}
                        className="underline underline-offset-4 hover:opacity-80"
                      >
                        {leadName || `Lead #${job.lead_id}`}
                      </ReturnLink>
                    </>
                  ) : (
                    "No lead linked"
                  )
                }
                badges={
                  <>
                    <JobStatusBadge status={job.status} />
                    <HealthBadge health={job.health} />
                    {daysInStatus ? <StatusBadge>{daysInStatus}</StatusBadge> : null}
                  </>
                }
                actions={
                  <>
                    <Link href={`/jobs/${id}/edit`} className="btn btn-sm">
                      Edit
                    </Link>
                    <DetailMoreMenu label="More">
                      <DetailMoreMenuItem
                        type="button"
                        disabled={portalBusy}
                        onClick={handleGeneratePortalLink}
                      >
                        {portalBusy ? "Link…" : "Customer portal"}
                      </DetailMoreMenuItem>
                      <DetailMoreMenuItem
                        type="button"
                        disabled={portalMessageBusy}
                        onClick={handleCopyPortalMessage}
                      >
                        {portalMessageBusy ? "Message…" : "Copy portal message"}
                      </DetailMoreMenuItem>
                    </DetailMoreMenu>
                  </>
                }
              >
                {portalHint || job.description || job.address ? (
                  <>
                    {portalHint ? (
                      <p className="text-muted text-sm">{portalHint}</p>
                    ) : null}
                    {job.description ? (
                      <p className="text-muted text-sm leading-6">{job.description}</p>
                    ) : null}
                    {job.address ? (
                      <p className="text-muted text-sm">{job.address}</p>
                    ) : null}
                  </>
                ) : null}
              </DetailHeader>

              <SectionCard
                size="lg"
                title="Communication"
                description="Capture conversations and decisions for this job."
              >
                <NotesSection
                  entityType="job"
                  entityId={id}
                  onLoadState={setNotesLoadState}
                />
              </SectionCard>

              <SectionCard size="lg"
                title="Pipeline"
                description="Track where this job is in the workflow"
              >
                <div className="pipeline">
                  {JOB_STATUSES.map((status, index) => {
                    const currentIndex = JOB_STATUSES.indexOf(job.status ?? "New");
                    const isActive = status === job.status;
                    const isCompleted = index < currentIndex;
                    const isTooFarAhead = index > currentIndex + 1;
                    const isLocked = updatingStatus !== null || isTooFarAhead || isActive;

                    return (
                      <div key={status} className="pipeline-step">
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
              <SectionCard
                size="lg"
                title="Estimates"
                description="Pricing and scope tied to this job"
                right={
                  <Link
                    href={`/estimates/new?job_id=${id}`}
                    className="btn btn-primary btn-sm"
                  >
                    New estimate
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
                  <div className="min-w-0 space-y-3">
                    {sortedEstimates.map((estimate) => (
                      <ReturnLink
                        key={estimate.id}
                        href={`/estimates/${estimate.id}`}
                        className="list-row list-row-interactive list-row-split"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="break-words font-medium">{estimate.title}</div>

                          <div className="text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
                            <span className="shrink-0">
                              {formatDate(estimate.updated_at || estimate.created_at)}
                            </span>

                            {estimate.job?.address ? (
                              <>
                                <span className="shrink-0">•</span>
                                <span className="min-w-0 truncate">
                                  {estimate.job.address}
                                </span>
                              </>
                            ) : null}
                          </div>

                          {estimate.notes ? (
                            <div className="text-muted mt-2 line-clamp-2 break-words text-sm">
                              {estimate.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
                          <StatusBadge kind="estimate" status={estimate.status} />
                          <div className="text-sm font-semibold">
                            $
                            {formatCurrency(Number(estimate.grand_total || 0).toFixed(2))}
                          </div>
                        </div>
                      </ReturnLink>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                size="lg"
                title="Invoices"
                description="Billing tied to this job"
                right={
                  <Link
                    href={`/invoices/new?job_id=${id}`}
                    className="btn btn-primary btn-sm"
                  >
                    New invoice
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
                        <ReturnLink
                          key={inv.id}
                          href={`/invoices/${inv.id}`}
                          className="hover:bg-accent flex min-w-0 items-start justify-between gap-3 rounded-lg border p-4 transition"
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
                        </ReturnLink>
                      ))}
                  </div>
                )}
              </SectionCard>

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

              <SectionCard
                size="lg"
                title="Tasks"
                description="Follow-ups and appointments for this job"
                right={
                  <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
                    <ReturnLink
                      href={`/tasks/new?job_id=${id}`}
                      className="btn btn-sm"
                    >
                      Full form
                    </ReturnLink>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (isTaskFormOpen && taskForm.kind !== "appointment") {
                          setIsTaskFormOpen(false);
                          return;
                        }
                        openNewTaskForm();
                      }}
                    >
                      {isTaskFormOpen && taskForm.kind !== "appointment"
                        ? "Hide"
                        : "New task"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        if (isTaskFormOpen && taskForm.kind === "appointment") {
                          setIsTaskFormOpen(false);
                          return;
                        }
                        openScheduleAppointmentForm();
                      }}
                    >
                      {isTaskFormOpen && taskForm.kind === "appointment"
                        ? "Hide"
                        : "Schedule"}
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                    {isTaskFormOpen ? (
                      <div className="space-y-3">
                        <TaskForm
                          form={taskForm}
                          onChange={setTaskForm}
                          onSubmit={handleCreateTask}
                          saving={creatingTask}
                          error=""
                          submitLabel={
                            taskForm.kind === "appointment"
                              ? "Schedule appointment"
                              : "Create task"
                          }
                          cancelLabel="Clear"
                          onCancel={() =>
                            setTaskForm(
                              createEmptyTaskForm({
                                job_id: String(id),
                                status: "Pending",
                                kind: taskForm.kind || "task",
                              }),
                            )
                          }
                          contextType="job"
                          leads={[]}
                          jobs={[
                            {
                              id: String(id),
                              title: job?.title || `Job #${id}`,
                            },
                          ]}
                          loadingLeads={false}
                          loadingJobs={false}
                          isContextLocked={true}
                          layout="compact"
                        />
                        {taskForm.kind === "appointment" &&
                        EARLY_JOB_STATUSES.has(job?.status) ? (
                          <label className="text-muted flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={updateJobStatusOnSchedule}
                              onChange={(e) =>
                                setUpdateJobStatusOnSchedule(e.target.checked)
                              }
                            />
                            Set job status to Appointment Scheduled
                          </label>
                        ) : null}
                      </div>
                    ) : null}

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
                            <ReturnLink
                              href={`/tasks/${task.id}`}
                              className="block hover:opacity-80"
                            >
                              <div className="font-medium underline underline-offset-4">
                                {task.title}
                                {task.kind === "appointment" ? (
                                  <span className="text-muted ml-2 text-xs font-normal no-underline">
                                    Appointment
                                  </span>
                                ) : null}
                              </div>

                              {task.description ? (
                                <div className="text-muted mt-1 text-sm">
                                  {task.description}
                                </div>
                              ) : null}

                              <div className="text-muted mt-2 text-xs">
                                {task.kind === "appointment" ? "When" : "Due"}:{" "}
                                {formatTaskSchedule(task)}
                                {task.kind === "appointment" && task.location
                                  ? ` · ${task.location}`
                                  : null}
                              </div>
                            </ReturnLink>
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
              </SectionCard>

              <SectionCard
                id="section-files"
                size="lg"
                title="Attached Files"
                description="Drop photos here or choose files. Tag before/after and hide internal shots from the portal."
                right={
                  canManageFiles ? (
                    <label className="btn cursor-pointer px-3 py-2 text-xs">
                      {uploading ? "Uploading…" : "Upload files"}
                      <input
                        type="file"
                        className="hidden"
                        multiple
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

                {canManageFiles ? (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setFileDragOver(true);
                    }}
                    onDragLeave={() => setFileDragOver(false)}
                    onDrop={handleFileDrop}
                    className={`mb-3 rounded-lg border border-dashed p-4 text-sm ${
                      fileDragOver ? "border-strong bg-accent" : "text-muted"
                    }`}
                  >
                    {uploading
                      ? "Uploading…"
                      : "Drop files here to attach them to this job."}
                  </div>
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
                      <div key={file.id} className="list-row space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {file.original_name}
                            </div>
                            <div className="text-muted text-xs">
                              {file.mime_type || "Unknown type"} •{" "}
                              {formatBytes(file.size_bytes)}
                            </div>
                            <div className="text-muted text-xs">
                              Uploaded: {formatDate(file.created_at)}
                            </div>
                            {!canManageFiles && file.caption ? (
                              <div className="text-muted mt-1 text-xs">
                                {file.caption}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                                {busyFileId === file.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {canManageFiles ? (
                          <div className="border-base space-y-3 border-t pt-3">
                            <label className="text-muted block min-w-0 text-xs">
                              Caption
                              <input
                                className="input mt-1 w-full"
                                value={file.caption || ""}
                                onChange={(event) => {
                                  const caption = event.target.value;
                                  setFiles((prev) =>
                                    prev.map((row) =>
                                      row.id === file.id
                                        ? { ...row, caption }
                                        : row,
                                    ),
                                  );
                                }}
                                onBlur={(event) => {
                                  const caption =
                                    event.target.value.trim() || null;
                                  saveFileMeta(file.id, { caption });
                                }}
                                placeholder="Shown in the gallery"
                              />
                            </label>
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="text-muted block min-w-[9rem] flex-1 text-xs">
                                Category
                                <select
                                  className="input mt-1 w-full"
                                  value={file.category || "other"}
                                  onChange={(event) => {
                                    saveFileMeta(file.id, {
                                      category: event.target.value,
                                    });
                                  }}
                                >
                                  <option value="before">Before</option>
                                  <option value="after">After</option>
                                  <option value="other">Other</option>
                                </select>
                              </label>
                              <label className="text-muted flex shrink-0 items-center gap-2 pb-2.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={file.client_visible !== false}
                                  onChange={(event) => {
                                    saveFileMeta(file.id, {
                                      client_visible: event.target.checked,
                                    });
                                  }}
                                />
                                Show in portal
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-base mt-4 border-t pt-4">
                  <PhotoGallery
                    files={files}
                    loading={loadingFiles && files.length === 0}
                  />
                </div>
              </SectionCard>
              <CollapsibleSection
                id="section-activity"
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
        ) : null}
      </div>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
      {confirmModal}
    </AppShell>
  );
}
