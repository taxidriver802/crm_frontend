"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import {
  formatBytes,
  buildFileUrl,
  formatDate,
  formatDue,
  isPreviewableFile,
  getLinkedEntity,
} from "@/lib/helper";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { SectionSkeleton, Skeleton } from "@/components/loading/loadingSkeletons";

function isCompleted(task) {
  return String(task?.status || "").toLowerCase() === "completed";
}

function isOverdue(task) {
  if (!task?.due_date || isCompleted(task)) return false;
  const d = new Date(task.due_date);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function isDueSoon(task) {
  if (!task?.due_date || isCompleted(task)) return false;
  const now = Date.now();
  const due = new Date(task.due_date).getTime();
  if (Number.isNaN(due)) return false;
  return due > now && due <= now + 1000 * 60 * 60 * 24;
}

function TaskStatusBadge({ task }) {
  if (isCompleted(task)) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
        Completed
      </span>
    );
  }

  if (isOverdue(task)) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
        Pending
      </span>
    );
  }

  return <span className="status-chip">{task?.status ?? "Pending"}</span>;
}

function InfoCard({ title, children, className = "" }) {
  return (
    <section className={`card rounded-lg p-4 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [lead, setLead] = useState(null);
  const [files, setFiles] = useState([]);

  const [loadingTask, setLoadingTask] = useState(true);
  const [loadingLead, setLoadingLead] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [busyFileId, setBusyFileId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");
  const [filesError, setFilesError] = useState("");
  const [success, setSuccess] = useState("");

  const [previewFile, setPreviewFile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  async function loadCurrentUser() {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      router.replace("/login");
      return null;
    }

    const data = await res.json();
    return data.user;
  }

  useEffect(() => {
    async function boot() {
      try {
        const user = await loadCurrentUser();
        setCurrentUser(user);
        if (!user) return;
      } catch (err) {
        console.error(err);
        router.replace("/login");
      }
    }

    boot();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      if (!id) return;

      try {
        setLoadingTask(true);
        setError("");

        const res = await api(`/tasks/${id}`);
        if (cancelled) return;

        const nextTask = res?.task ?? res;
        setTask(nextTask || null);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load task", e);
        setError(e?.message || "Failed to load task");
        setTask(null);
      } finally {
        if (!cancelled) setLoadingTask(false);
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      if (!task?.lead_id) {
        setLead(null);
        setLeadError("");
        return;
      }

      try {
        setLoadingLead(true);
        setLeadError("");

        const res = await api(`/leads/${task.lead_id}`);
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
  }, [task?.lead_id]);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      if (!task?.lead_id && !task?.job_id) {
        setFiles([]);
        setFilesError("");
        return;
      }

      try {
        setLoadingFiles(true);
        setFilesError("");

        let res = null;

        if (task.job_id) {
          res = await api(`/files?job_id=${task.job_id}`);
        } else if (task.lead_id) {
          res = await api(`/files?lead_id=${task.lead_id}`);
        }

        if (cancelled) return;
        setFiles(res?.files || []);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load related files", e);
        setFiles([]);
        setFilesError(e?.message || "Failed to load related files");
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    }

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, [task]);

  async function refreshTask() {
    const res = await api(`/tasks/${id}`);
    const nextTask = res?.task ?? res;
    setTask(nextTask);
    return nextTask;
  }

  async function updateStatus(nextStatus) {
    try {
      setBusy(true);
      setError("");

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      await refreshTask();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to update task");
    } finally {
      setBusy(false);
    }
  }

  async function quickReschedule(daysToAdd) {
    if (!task) return;

    try {
      setBusy(true);
      setError("");

      const base = task?.due_date ? new Date(task.due_date) : new Date();
      if (Number.isNaN(base.getTime())) {
        throw new Error("Invalid due date");
      }

      const next = new Date(base);
      next.setDate(next.getDate() + daysToAdd);

      await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ due_date: next.toISOString() }),
      });

      await refreshTask();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to reschedule task");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      setBusy(true);
      await api(`/tasks/${id}`, { method: "DELETE" });
      router.push("/tasks");
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to delete task");
    } finally {
      setBusy(false);
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

  const recentFiles = useMemo(() => files.slice(0, 5), [files]);
  const canManageFiles = currentUser?.role === "owner" || currentUser?.role === "admin";
  const linked = getLinkedEntity(task);

  return (
    <AppShell title={task?.title || `Task #${id}`}>
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        {success ? <div className="text-sm text-green-600">{success}</div> : null}

        <section className="card rounded-lg p-4">
          {loadingTask ? (
            <>
              <div className="space-y-4">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-48" />

                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>

                <Skeleton className="h-16 w-full" />
              </div>
            </>
          ) : !task ? (
            <div className="text-muted text-sm">Task not found.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-semibold">{task.title}</div>

                  <div className="text-muted mt-2 text-sm">
                    {linked.href ? (
                      <>
                        Related {linked.kind?.toLowerCase()}:{" "}
                        <Link
                          href={linked.href}
                          className="underline underline-offset-4 hover:opacity-80"
                        >
                          {linked.label}
                        </Link>
                      </>
                    ) : (
                      "No context linked"
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TaskStatusBadge task={task} />

                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {formatDue(task.due_date)}
                  </span>

                  {isOverdue(task) ? (
                    <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
                      Overdue
                    </span>
                  ) : isDueSoon(task) ? (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                      Due soon
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-muted text-xs">Description</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {task.description || "No description provided."}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/tasks/${id}/edit`} className="btn">
                  Edit Task
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    updateStatus(isCompleted(task) ? "Pending" : "Completed")
                  }
                  disabled={busy}
                  className="btn disabled:opacity-60"
                >
                  {isCompleted(task) ? "Reopen Task" : "Mark Complete"}
                </button>

                <DetailMoreMenu label="More">
                  {task.lead_id ? (
                    <DetailMoreMenuItem
                      as={Link}
                      href={`/leads/${task.lead_id}`}
                      className="text-main"
                    >
                      View Related Lead
                    </DetailMoreMenuItem>
                  ) : task.job_id ? (
                    <DetailMoreMenuItem
                      as={Link}
                      href={`/jobs/${task.job_id}`}
                      className="text-main"
                    >
                      View Related Job
                    </DetailMoreMenuItem>
                  ) : null}

                  {!isCompleted(task) ? (
                    <>
                      <DetailMoreMenuItem
                        type="button"
                        disabled={busy}
                        className="text-main disabled:opacity-50"
                        onClick={() => quickReschedule(1)}
                      >
                        +1 Day
                      </DetailMoreMenuItem>
                      <DetailMoreMenuItem
                        type="button"
                        disabled={busy}
                        className="text-main disabled:opacity-50"
                        onClick={() => quickReschedule(3)}
                      >
                        +3 Days
                      </DetailMoreMenuItem>
                      <DetailMoreMenuItem
                        type="button"
                        disabled={busy}
                        className="text-main disabled:opacity-50"
                        onClick={() => quickReschedule(7)}
                      >
                        +1 Week
                      </DetailMoreMenuItem>
                    </>
                  ) : null}

                  <DetailMoreMenuItem
                    type="button"
                    className="text-red-600 disabled:opacity-50"
                    disabled={busy}
                    onClick={handleDelete}
                  >
                    Delete task
                  </DetailMoreMenuItem>
                </DetailMoreMenu>
              </div>
            </div>
          )}
        </section>
        {loadingTask ? (
          <div className="flex flex-row gap-5">
            <section className="card h-[15rem] w-[40rem] rounded-lg p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-32" />
              </div>
            </section>

            <section className="card w-[45rem] rounded-lg p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-32" />
              </div>
            </section>
          </div>
        ) : null}
        {task ? (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            {task?.lead ? (
              <InfoCard title="Lead Snapshot">
                {!task?.lead_id ? (
                  <div className="text-muted text-sm">No lead linked to this task.</div>
                ) : loadingLead ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : leadError ? (
                  <div className="text-sm text-red-500">{leadError}</div>
                ) : !lead ? (
                  <div className="text-muted text-sm">Lead details unavailable.</div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-muted text-xs">Name</div>
                      <div className="mt-1 font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted text-xs">Contact</div>
                      <div className="mt-1">
                        {lead.email || "—"}
                        {lead.phone ? ` • ${lead.phone}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {lead.status ?? "—"}
                      </span>

                      {lead.source ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          Source: {lead.source}
                        </span>
                      ) : null}
                    </div>

                    {lead.notes ? (
                      <div>
                        <div className="text-muted text-xs">Notes</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm">
                          {lead.notes}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </InfoCard>
            ) : null}

            {task?.job ? (
              <InfoCard title="Job Snapshot">
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted text-xs">Title</div>
                    <div className="mt-1 font-medium">{task.job.title}</div>
                  </div>

                  {task.job.address ? (
                    <div>
                      <div className="text-muted text-xs">Address</div>
                      <div className="mt-1">{task.job.address}</div>
                    </div>
                  ) : null}

                  {task.job.status ? (
                    <div>
                      <div className="text-muted text-xs">Status</div>
                      <div className="mt-1">{task.job.status}</div>
                    </div>
                  ) : null}
                </div>
              </InfoCard>
            ) : null}

            <CollapsibleSection
              title="Related Files"
              description="Recent files connected to this task."
              defaultOpen={true}
              actions={
                <>
                  {task?.lead ? (
                    <Link
                      href={`/leads/${task.lead.id}`}
                      className="btn px-3 py-2 text-xs"
                    >
                      Open lead
                    </Link>
                  ) : null}

                  {task?.job ? (
                    <Link href={`/jobs/${task.job.id}`} className="btn px-3 py-2 text-xs">
                      Open job
                    </Link>
                  ) : null}
                </>
              }
            >
              {loadingFiles ? (
                <SectionSkeleton rows={3} />
              ) : filesError ? (
                <div className="text-sm text-red-500">{filesError}</div>
              ) : recentFiles.length === 0 ? (
                <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                  No files available for this task yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      {" "}
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
