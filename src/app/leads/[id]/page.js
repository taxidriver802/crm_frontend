"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { NotesSection } from "@/components/notes-section";

function isCompletedTask(task) {
  return String(task?.status || "").toLowerCase() === "completed";
}

function isOverdueTask(task) {
  if (!task?.due_date || isCompletedTask(task)) return false;
  const due = new Date(task.due_date);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function statusPillClasses(status) {
  const value = String(status || "").toLowerCase();

  if (value === "completed") {
    return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
  }

  if (value === "pending") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-base bg-app text-main";
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-muted text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();

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

  const handleDeleteLead = async () => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    try {
      await api(`/leads/${id}`, { method: "DELETE" });
      router.push("/leads");
    } catch (e) {
      alert(e?.message || "Failed to delete lead");
    }
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

  async function handleDeleteFile(fileId) {
    const confirmed = window.confirm("Delete this file?");
    if (!confirmed) return;

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
  }

  const openTasks = useMemo(
    () => tasks.filter((task) => !isCompletedTask(task)),
    [tasks],
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => isCompletedTask(task)),
    [tasks],
  );

  const overdueOpenTasks = useMemo(
    () => openTasks.filter((task) => isOverdueTask(task)),
    [openTasks],
  );

  return (
    <AppShell
      title={
        lead
          ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || `Lead #${id}`
          : `Lead #${id}`
      }
    >
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        {success ? <div className="text-sm text-green-600">{success}</div> : null}

        <section className="card rounded-lg p-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>

              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          ) : !lead ? (
            <div className="text-muted text-sm">Lead not found.</div>
          ) : (
            <div className="space-y-5">
              <div className="min-w-0">
                <div className="text-2xl font-semibold">
                  {lead.first_name} {lead.last_name}
                </div>

                <div className="text-muted mt-2 text-sm">
                  {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="status-chip">{lead.status ?? "—"}</span>

                  {lead.source ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      Source: {lead.source}
                    </span>
                  ) : null}

                  {lead.budget_min != null || lead.budget_max != null ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      Budget: {lead.budget_min ?? "—"} - {lead.budget_max ?? "—"}
                    </span>
                  ) : null}
                </div>
              </div>

              {lead.notes ? (
                <div>
                  <div className="text-muted text-xs">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{lead.notes}</div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => router.push("/leads")}
                >
                  Back to Leads
                </button>
                <Link href={`/leads/${id}/edit`} className="btn px-3 py-2 text-xs">
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
                    className="text-red-600"
                    onClick={handleDeleteLead}
                  >
                    Delete lead
                  </DetailMoreMenuItem>
                </DetailMoreMenu>
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card space-y-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Open Tasks" value={openTasks.length} />
            <StatCard label="Overdue" value={overdueOpenTasks.length} />
            <StatCard label="Files" value={files.length} />
          </section>
        )}

        <CollapsibleSection
          title="Notes"
          description="Call notes, decisions, and context for this lead."
          defaultOpen={true}
        >
          <NotesSection entityType="lead" entityId={id} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Jobs"
          description="Workspaces tied to this lead."
          defaultOpen={true}
          actions={
            <Link
              href={`/jobs?lead_id=${id}&open=create`}
              className="btn px-3 py-2 text-xs"
            >
              + New Job
            </Link>
          }
        >
          {jobsError ? (
            <div className="text-sm text-red-500">{jobsError}</div>
          ) : loadingJobs ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="hover:bg-accent block rounded-lg border p-3 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-muted text-sm">{job.address ?? "—"}</div>
                    </div>

                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <CollapsibleSection
            title="Lead Tasks"
            description="Open and completed work tied to this lead."
            defaultOpen={true}
            actions={
              <Link href={`/tasks/new?lead_id=${id}`} className="btn px-3 py-2 text-xs">
                + New Task
              </Link>
            }
          >
            {tasksError ? (
              <div className="text-sm text-red-500">{tasksError}</div>
            ) : loadingTasks ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
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
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Open</div>

                  {openTasks.length === 0 ? (
                    <div className="text-muted text-sm">No open tasks.</div>
                  ) : (
                    openTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="hover:bg-accent block rounded-lg border p-3 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-muted mt-1 text-sm">
                              Due: {formatDateTime(task.due_date)}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusPillClasses(task.status)}`}
                            >
                              {task.status ?? "—"}
                            </span>

                            {isOverdueTask(task) ? (
                              <span className="text-xs text-red-500">Overdue</span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Completed</div>

                  {completedTasks.length === 0 ? (
                    <div className="text-muted text-sm">No completed tasks yet.</div>
                  ) : (
                    completedTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="hover:bg-accent block rounded-lg border p-3 opacity-85 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-muted mt-1 text-sm">
                              Due: {formatDateTime(task.due_date)}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusPillClasses(task.status)}`}
                          >
                            {task.status ?? "—"}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Attached Files"
            description="Files uploaded directly to this lead."
            defaultOpen={true}
            actions={
              canManageFiles ? (
                <label className="btn cursor-pointer px-3 py-2 text-xs">
                  {uploading ? "Uploading…" : "Upload File"}
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
              <div className="mb-3 text-sm text-red-500">{filesError}</div>
            ) : null}

            {loadingFiles ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
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
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
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
                          className="btn px-3 py-1.5 text-xs text-red-600"
                        >
                          {busyFileId === file.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </section>
      </div>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </AppShell>
  );
}
