"use client";

import { Alert } from "@/components/ui/alert";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReturnLink } from "@/components/return-to";
import { api } from "@/lib/api";
import {
  buildFileUrl,
  formatBytes,
  formatDate,
  formatDateTime,
  formatDaysInStatus,
  API_BASE,
  isPreviewableFile,
  isTaskOverdue,
} from "@/lib/helper";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { NotesSection } from "@/components/notes-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailHeader } from "@/components/ui/detail-header";
import { SectionCard } from "@/components/ui/section-card";
import { MetaItem } from "@/components/ui/meta";

function isCompletedTask(task) {
  return String(task?.status || "").toLowerCase() === "completed";
}

function isOverdueTask(task) {
  return isTaskOverdue(task);
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);

  const [error, setError] = useState("");
  const [tasksError, setTasksError] = useState("");
  const [filesError, setFilesError] = useState("");
  const [success, setSuccess] = useState("");
  const [notesLoadState, setNotesLoadState] = useState({ ready: false, empty: true });

  const canManageFiles = currentUser?.role === "owner" || currentUser?.role === "admin";

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

    async function loadLead() {
      try {
        setLoading(true);
        setError("");
        const res = await api(`/leads/${id}`);
        if (!alive) return;
        setLead(res.lead ?? res);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load lead");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    async function loadLeadTasks() {
      try {
        setLoadingTasks(true);
        setTasksError("");
        const res = await api(`/tasks?leadId=${id}&limit=50&offset=0`);
        if (!alive) return;
        setTasks(res.tasks || []);
      } catch (e) {
        if (!alive) return;
        setTasksError(e?.message || "Failed to load tasks");
      } finally {
        if (!alive) return;
        setLoadingTasks(false);
      }
    }

    async function loadLeadFiles() {
      try {
        setLoadingFiles(true);
        setFilesError("");
        const res = await api(`/files?lead_id=${id}`);
        if (!alive) return;
        setFiles(res.files || []);
      } catch (e) {
        if (!alive) return;
        setFilesError(e?.message || "Failed to load files");
      } finally {
        if (!alive) return;
        setLoadingFiles(false);
      }
    }

    async function loadLeadJobs() {
      try {
        setLoadingJobs(true);
        setJobsError("");

        const res = await api(`/jobs?leadId=${id}&limit=50&offset=0`);
        if (!alive) return;

        setJobs(res.jobs || []);
      } catch (e) {
        if (!alive) return;
        setJobsError(e?.message || "Failed to load jobs");
      } finally {
        if (!alive) return;
        setLoadingJobs(false);
      }
    }

    if (id) {
      loadCurrentUser();
      loadLead();
      loadLeadTasks();
      loadLeadFiles();
      loadLeadJobs();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  const handleDeleteLead = () => {
    askConfirm({
      title: "Delete this lead?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await api(`/leads/${id}`, { method: "DELETE" });
          router.push("/leads");
        } catch (e) {
          alert(e?.message || "Failed to delete lead");
        }
      },
    });
  };

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFilesError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("lead_id", String(id));

      const response = await fetch(`${API_BASE}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed.");
      }

      const refreshed = await api(`/files?lead_id=${id}`);
      setFiles(refreshed.files || []);
      setSuccess("File uploaded to lead.");
      event.target.value = "";
    } catch (e) {
      console.error(e);
      setFilesError(e?.message || "Failed to upload file");
    } finally {
      setUploading(false);
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
        setSuccess("");

        try {
          await api(`/files/${fileId}`, {
            method: "DELETE",
          });

          setFiles((prev) => prev.filter((file) => file.id !== fileId));
          setSuccess("File deleted successfully.");
        } catch (e) {
          console.error(e);
          setFilesError(e?.message || "Failed to delete file");
        } finally {
          setBusyFileId(null);
        }
      },
    });
  }

  const openTasks = useMemo(
    () => tasks.filter((task) => !isCompletedTask(task)),
    [tasks],
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => isCompletedTask(task)),
    [tasks],
  );

  const leadName = lead
    ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || `Lead #${id}`
    : `Lead #${id}`;
  const leadContact = lead
    ? [lead.email, lead.phone].filter(Boolean).join(" • ")
    : "";

  return (
    <AppShell title={leadName} description={leadContact || undefined}>
      <div className="min-w-0 space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}
        {success ? <Alert variant="inline" tone="success">{success}</Alert> : null}

        {loading ? (
          <section className="card p-4">
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </section>
        ) : !lead ? (
          <section className="card p-4">
            <p className="text-muted text-sm">Lead not found.</p>
          </section>
        ) : (
          <DetailHeader
            subtitle={leadContact || "No contact on file"}
            badges={
              <>
                <StatusBadge kind="lead" status={lead.status ?? "—"} />
                {formatDaysInStatus(lead.status_changed_at) ? (
                  <StatusBadge>{formatDaysInStatus(lead.status_changed_at)}</StatusBadge>
                ) : null}
                {lead.source ? <StatusBadge>Source: {lead.source}</StatusBadge> : null}
                {lead.service_type ? (
                  <StatusBadge>{lead.service_type}</StatusBadge>
                ) : null}
                {lead.preferred_contact_method ? (
                  <StatusBadge>Prefers {lead.preferred_contact_method}</StatusBadge>
                ) : null}
                {lead.urgency ? (
                  <StatusBadge>Urgency: {lead.urgency}</StatusBadge>
                ) : null}
                {lead.budget_min != null || lead.budget_max != null ? (
                  <StatusBadge>
                    Budget: {lead.budget_min ?? "—"} - {lead.budget_max ?? "—"}
                  </StatusBadge>
                ) : null}
              </>
            }
            actions={
              <>
                <Link href={`/leads/${id}/edit`} className="btn btn-sm">
                  Edit
                </Link>
                <DetailMoreMenu label="More">
                  <DetailMoreMenuItem
                    as={Link}
                    href={`/jobs?lead_id=${id}&open=create`}
                    className="text-main"
                  >
                    New Job
                  </DetailMoreMenuItem>
                  <DetailMoreMenuItem
                    as={Link}
                    href={`/tasks/new?lead_id=${id}`}
                    className="text-main"
                  >
                    New Task
                  </DetailMoreMenuItem>
                  <DetailMoreMenuItem
                    type="button"
                    className="text-danger"
                    onClick={handleDeleteLead}
                  >
                    Delete lead
                  </DetailMoreMenuItem>
                </DetailMoreMenu>
              </>
            }
          >
            {lead.notes ? (
              <MetaItem label="Notes">
                <span className="whitespace-pre-wrap">{lead.notes}</span>
              </MetaItem>
            ) : null}
          </DetailHeader>
        )}

        <SectionCard
          size="lg"
          title="Communication"
          description="Call notes, decisions, and context for this lead."
        >
          <NotesSection
            entityType="lead"
            entityId={id}
            onLoadState={setNotesLoadState}
          />
        </SectionCard>

        <SectionCard
          size="lg"
          title="Jobs"
          description="Workspaces tied to this lead"
          right={
            <Link
              href={`/jobs?lead_id=${id}&open=create`}
              className="btn btn-primary btn-sm"
            >
              New job
            </Link>
          }
        >
          {jobsError ? (
            <Alert variant="inline">{jobsError}</Alert>
          ) : loadingJobs ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="list-row space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No jobs for this lead yet.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <ReturnLink
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="list-row list-row-interactive block"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-muted text-sm">{job.address ?? "—"}</div>
                    </div>
                    <StatusBadge kind="job" status={job.status} />
                  </div>
                </ReturnLink>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          size="lg"
          title="Tasks"
          description="Follow-ups and appointments for this lead"
          right={
            <Link href={`/tasks/new?lead_id=${id}`} className="btn btn-primary btn-sm">
              New task
            </Link>
          }
        >
          {tasksError ? (
            <Alert variant="inline">{tasksError}</Alert>
          ) : loadingTasks ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="list-row space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No tasks for this lead yet.
            </div>
          ) : (
            <div className="space-y-3">
              {[...openTasks, ...completedTasks].map((task) => (
                <ReturnLink
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className={`list-row list-row-interactive block ${
                    isCompletedTask(task) ? "opacity-85" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-muted mt-1 text-sm">
                        Due: {formatDateTime(task.due_date)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge kind="task" status={task.status} />
                      {isOverdueTask(task) ? (
                        <span className="text-xs text-danger">Overdue</span>
                      ) : null}
                    </div>
                  </div>
                </ReturnLink>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="section-files"
          size="lg"
          title="Attached Files"
          description="Files uploaded directly to this lead"
          right={
            canManageFiles ? (
              <label className="btn cursor-pointer px-3 py-2 text-xs">
                {uploading ? "Uploading…" : "Upload files"}
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

          {loadingFiles ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="list-row space-y-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No files attached to this lead yet.
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="list-row list-row-split"
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
                        {busyFileId === file.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
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
