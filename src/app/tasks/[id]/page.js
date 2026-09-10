"use client";

import { Alert } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReturnLink } from "@/components/return-to";
import { api } from "@/lib/api";
import {
  formatBytes,
  buildFileUrl,
  formatDate,
  formatTaskSchedule,
  isPreviewableFile,
  getLinkedEntity,
  isTaskOverdue,
} from "@/lib/helper";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { SectionSkeleton, Skeleton } from "@/components/loading/loadingSkeletons";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailHeader } from "@/components/ui/detail-header";
import { SectionCard } from "@/components/ui/section-card";
import { MetaItem } from "@/components/ui/meta";

function isCompleted(task) {
  return String(task?.status || "").toLowerCase() === "completed";
}

function isOverdue(task) {
  return isTaskOverdue(task);
}

function isDueSoon(task) {
  if (!task?.due_date || isCompleted(task) || isTaskOverdue(task)) return false;
  const now = Date.now();
  // Appointments with an end are "due soon" only as the end approaches
  const deadline =
    task?.kind === "appointment" && task?.end_at
      ? new Date(task.end_at).getTime()
      : new Date(task.due_date).getTime();
  if (Number.isNaN(deadline)) return false;
  return deadline > now && deadline <= now + 1000 * 60 * 60 * 24;
}

function TaskStatusBadge({ task }) {
  if (isCompleted(task)) {
    return <StatusBadge tone="success">Completed</StatusBadge>;
  }
  if (isOverdue(task)) {
    return <StatusBadge tone="danger">{task?.status ?? "Pending"}</StatusBadge>;
  }
  if (isDueSoon(task)) {
    return <StatusBadge tone="warning">{task?.status ?? "Pending"}</StatusBadge>;
  }
  return <StatusBadge kind="task" status={task?.status ?? "Pending"} />;
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [task, setTask] = useState(null);
  const [files, setFiles] = useState([]);

  const [loadingTask, setLoadingTask] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [busyFileId, setBusyFileId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
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

  function handleDelete() {
    askConfirm({
      title: "Delete this task?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
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
      },
    });
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

  const canManageFiles = currentUser?.role === "owner" || currentUser?.role === "admin";
  const linked = getLinkedEntity(task);

  return (
    <AppShell
      title={task?.title || `Task #${id}`}
      description={linked?.label || undefined}
    >
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}
        {success ? <Alert variant="inline" tone="success">{success}</Alert> : null}

        {loadingTask ? (
          <section className="card p-4">
            <div className="space-y-4">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          </section>
        ) : !task ? (
          <section className="card p-4">
            <p className="text-muted text-sm">Task not found.</p>
          </section>
        ) : (
          <DetailHeader
            subtitle={
              linked.href ? (
                <>
                  Related {linked.kind?.toLowerCase()}:{" "}
                  <ReturnLink
                    href={linked.href}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    {linked.label}
                  </ReturnLink>
                </>
              ) : (
                "No context linked"
              )
            }
            badges={
              <>
                <TaskStatusBadge task={task} />
                {task.kind === "appointment" ? (
                  <StatusBadge>Appointment</StatusBadge>
                ) : null}
                <StatusBadge>{formatTaskSchedule(task)}</StatusBadge>
                {isOverdue(task) ? (
                  <StatusBadge tone="danger">Overdue</StatusBadge>
                ) : isDueSoon(task) ? (
                  <StatusBadge tone="warning">Due soon</StatusBadge>
                ) : null}
              </>
            }
            actions={
              <>
                <Link href={`/tasks/${id}/edit`} className="btn btn-sm">
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    updateStatus(isCompleted(task) ? "Pending" : "Completed")
                  }
                  disabled={busy}
                  className="btn btn-sm"
                >
                  {isCompleted(task) ? "Reopen" : "Mark complete"}
                </button>
                <DetailMoreMenu label="More">
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
                    className="text-danger disabled:opacity-50"
                    disabled={busy}
                    onClick={handleDelete}
                  >
                    Delete task
                  </DetailMoreMenuItem>
                </DetailMoreMenu>
              </>
            }
          >
            {task.kind === "appointment" && task.location ? (
              <MetaItem label="Location">{task.location}</MetaItem>
            ) : null}
            <MetaItem label="Description">
              <span className="whitespace-pre-wrap">
                {task.description || "No description provided."}
              </span>
            </MetaItem>
          </DetailHeader>
        )}

        {task ? (
          <SectionCard
            size="lg"
            title="Attached Files"
            description="Files connected to this task"
          >
            {loadingFiles ? (
              <SectionSkeleton rows={3} />
            ) : filesError ? (
              <Alert variant="inline">{filesError}</Alert>
            ) : files.length === 0 ? (
              <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                No files available for this task yet.
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
