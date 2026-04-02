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
  formatDateTime,
  API_BASE,
  isPreviewableFile,
} from "@/lib/helper";
import { FilePreviewModal } from "@/components/file-preview-modal";

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

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();

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

    if (id) {
      loadCurrentUser();
      loadLead();
      loadLeadTasks();
      loadLeadFiles();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  const handleDeleteLead = async () => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      router.push("/leads");
      api(`/leads/${id}`, { method: "DELETE" }).catch((e) => {
        alert(e?.message || "Failed to delete lead");
      });
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
    <AppShell title={`Lead #${id}`}>
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        {success ? <div className="text-sm text-green-600">{success}</div> : null}

        <div className="bg-surface border-base rounded-lg border p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : !lead ? (
            <div className="text-muted-foreground text-sm">Not found.</div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <div className="text-xl font-semibold">
                  {lead.first_name} {lead.last_name}
                </div>

                <div className="text-muted-foreground text-sm">
                  {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
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

                  {lead.budget_min != null || lead.budget_max != null ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      Budget: {lead.budget_min ?? "—"} - {lead.budget_max ?? "—"}
                    </span>
                  ) : null}
                </div>

                {lead.notes ? (
                  <div className="pt-3 text-sm">
                    <div className="text-muted-foreground text-xs">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap">{lead.notes}</div>
                  </div>
                ) : null}
              </div>

              <button
                className="border-base hover:bg-accent-soft flex h-8 w-8 items-center justify-center rounded border p-1 sm:ml-auto"
                onClick={handleDeleteLead}
                aria-label="Delete lead"
                title="Delete lead"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="text-muted text-xs">Open tasks</div>
            <div className="mt-1 text-2xl font-semibold">{openTasks.length}</div>
          </div>

          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="text-muted text-xs">Overdue</div>
            <div className="mt-1 text-2xl font-semibold">{overdueOpenTasks.length}</div>
          </div>

          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="text-muted text-xs">Files</div>
            <div className="mt-1 text-2xl font-semibold">{files.length}</div>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/tasks/new?lead_id=${id}`}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              + Create task for this lead
            </Link>

            <Link
              href={`/leads/${id}/edit`}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Edit
            </Link>
          </div>

          <button
            className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            onClick={() => router.push("/leads")}
          >
            Back to leads
          </button>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-surface border-base rounded-lg border">
            <div className="border-base flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Lead Tasks</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Open and completed work tied to this lead.
                </p>
              </div>

              <Link
                href={`/tasks/new?lead_id=${id}`}
                className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
              >
                + New task
              </Link>
            </div>

            <div className="space-y-6 p-4">
              {tasksError ? (
                <div className="text-sm text-red-500">{tasksError}</div>
              ) : loadingTasks ? (
                <div className="text-muted-foreground text-sm">Loading tasks…</div>
              ) : tasks.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                  No tasks for this lead yet.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Open</div>

                    {openTasks.length === 0 ? (
                      <div className="text-muted-foreground text-sm">No open tasks.</div>
                    ) : (
                      openTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className="hover:bg-accent-soft block rounded-lg border p-3 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-muted-foreground mt-1 text-sm">
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
                      <div className="text-muted-foreground text-sm">
                        No completed tasks yet.
                      </div>
                    ) : (
                      completedTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className="hover:bg-accent-soft block rounded-lg border p-3 opacity-85 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-muted-foreground mt-1 text-sm">
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
                </>
              )}
            </div>
          </div>

          <section className="bg-surface border-base rounded-lg border">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Attached Files</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Files uploaded directly to this lead.
                </p>
              </div>

              {canManageFiles ? (
                <label className="hover:bg-accent-soft inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
                  {uploading ? "Uploading…" : "Upload file"}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              ) : null}
            </div>

            <div className="p-4">
              {filesError ? (
                <div className="mb-3 text-sm text-red-500">{filesError}</div>
              ) : null}

              {loadingFiles ? (
                <div className="text-muted-foreground text-sm">Loading files…</div>
              ) : files.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
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
                        <div className="text-muted-foreground mt-1 text-xs">
                          {file.mime_type || "Unknown type"} •{" "}
                          {formatBytes(file.size_bytes)}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Uploaded: {formatDate(file.created_at)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isPreviewableFile(file) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="hover:bg-accent-soft rounded-md border px-3 py-1.5 text-xs"
                          >
                            Preview
                          </button>
                        ) : (
                          <a
                            href={buildFileUrl(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:bg-accent-soft rounded-md border px-3 py-1.5 text-xs"
                          >
                            Open
                          </a>
                        )}

                        {canManageFiles ? (
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={busyFileId === file.id}
                            className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            {busyFileId === file.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
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
