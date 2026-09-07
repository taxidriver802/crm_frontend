"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";


import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { api } from "@/lib/api";
import {
  getFileTypeLabel,
  buildFileUrl,
  formatBytes,
  formatDate,
  isPreviewableFile,
  API_BASE,
} from "@/lib/helper";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import {
  FilterBarSkeleton,
  Skeleton,
  StatCardSkeleton,
  TableRowSkeleton,
} from "@/components/loading/loadingSkeletons";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field } from "@/components/ui/field";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, Td } from "@/components/ui/data-table";
import { EmptyState } from "@/components/error-boundary";

function ScopeBadge({ file }) {
  const push = useReturnPush();
  if (file.lead_id) {
    return (
      <button
        onClick={() => push(`/leads/${file.lead_id}`)}
        className="text-sm underline underline-offset-4 hover:opacity-80"
      >
        Lead #{file.lead_id}
      </button>
    );
  }

  if (file.job_id) {
    return (
      <button
        onClick={() => push(`/jobs/${file.job_id}`)}
        className="text-sm underline underline-offset-4 hover:opacity-80"
      >
        Job #{file.job_id}
      </button>
    );
  }

  return <span className="text-muted text-sm">General</span>;
}

export default function FilesPage() {
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [currentUser, setCurrentUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const isInitialLoading = loadingFiles && files.length === 0;

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

  async function loadFiles() {
    setLoadingFiles(true);
    setError("");

    try {
      const data = await api("/files");
      setFiles(data.files ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load files.");
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const user = await loadCurrentUser();
        setCurrentUser(user);

        if (!user) return;

        await loadFiles();
      } catch (err) {
        console.error(err);
        router.replace("/login");
      } finally {
        setLoadingUser(false);
      }
    }

    boot();
  }, [router]);

  const canManageFiles = currentUser?.role === "owner" || currentUser?.role === "admin";

  const counts = useMemo(() => {
    return {
      total: files.length,
      general: files.filter((f) => !f.lead_id && !f.job_id).length,
      leadLinked: files.filter((f) => !!f.lead_id).length,
      jobLinked: files.filter((f) => !!f.job_id).length,
    };
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (scopeFilter === "general" && (file.lead_id || file.job_id)) return false;
      if (scopeFilter === "lead" && !file.lead_id) return false;
      if (scopeFilter === "job" && !file.job_id) return false;

      if (typeFilter !== "all") {
        const mime = (file.mime_type || "").toLowerCase();
        const originalName = (file.original_name || "").toLowerCase();

        if (
          typeFilter === "pdf" &&
          !mime.includes("pdf") &&
          !originalName.endsWith(".pdf")
        ) {
          return false;
        }

        if (
          typeFilter === "image" &&
          !mime.startsWith("image/") &&
          ![".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
            originalName.endsWith(ext),
          )
        ) {
          return false;
        }

        if (typeFilter === "other") {
          const isPdf = mime.includes("pdf") || originalName.endsWith(".pdf");
          const isImage =
            mime.startsWith("image/") ||
            [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
              originalName.endsWith(ext),
            );

          if (isPdf || isImage) return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const originalName = (file.original_name || "").toLowerCase();
        const mime = (file.mime_type || "").toLowerCase();
        const uploader = `${file.first_name ?? ""} ${file.last_name ?? ""}`.toLowerCase();

        if (
          !originalName.includes(query) &&
          !mime.includes(query) &&
          !uploader.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [files, scopeFilter, typeFilter, searchQuery]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed.");
      }

      setSuccess("File uploaded successfully.");
      await loadFiles();
      event.target.value = "";
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  function deleteFile(id) {
    askConfirm({
      title: "Delete this file?",
      description: "This file will be permanently removed.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setBusyId(id);
        setError("");
        setSuccess("");

        try {
          await api(`/files/${id}`, {
            method: "DELETE",
          });

          setSuccess("File deleted successfully.");
          await loadFiles();
        } catch (err) {
          console.error(err);
          setError("Failed to delete file.");
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  if (loadingUser) {
    return (
      <AppShell title="Files">
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </section>

          <FilterBarSkeleton />

          <div className="card p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const fileTitle = (
    <div>
      {loadingFiles
        ? "Loading…"
        : filteredFiles.length === 0
          ? "No files yet"
          : `${filteredFiles.length} file${filteredFiles.length === 1 ? "" : "s"}`}
    </div>
  );

  return (
    <AppShell
      title="Files"
      right={
        canManageFiles ? (
          <label className="btn cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? "Uploading..." : "Upload File"}
          </label>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isInitialLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="Total Files" value={counts.total} />
              <StatCard label="General" value={counts.general} />
              <StatCard label="Lead Files" value={counts.leadLinked} />
              <StatCard label="Job Files" value={counts.jobLinked} />
            </>
          )}
        </section>

        {error ? <Alert className="px-4 py-3">{error}</Alert> : null}

        {success ? (
          <Alert tone="success" className="px-4 py-3">
            {success}
          </Alert>
        ) : null}

        {isInitialLoading ? (
          <FilterBarSkeleton />
        ) : (
          <FilterBar>
            <Field label="Search" className="min-w-0 flex-1">
              <input
                type="text"
                placeholder="Search files, types, or uploader..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Scope" className="w-full lg:w-44">
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Scopes</option>
                <option value="general">General</option>
                <option value="lead">Lead Attached</option>
                <option value="job">Job Attached</option>
              </select>
            </Field>

            <Field label="Type" className="w-full lg:w-40">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </FilterBar>
        )}

        <CollapsibleSection title={fileTitle} defaultOpen={true}>
          {loadingFiles ? (
            <DataTable>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>Attached To</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={7} />
                  ))}
                </tbody>
            </DataTable>
          ) : files.length === 0 ? (
            <EmptyState title="No files uploaded yet" />
          ) : filteredFiles.length === 0 ? (
            <EmptyState title="No files match the current filters" />
          ) : (
            <DataTable>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>Attached To</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFiles.map((file) => {
                    const uploaderName =
                      [file.first_name, file.last_name].filter(Boolean).join(" ") ||
                      "Unknown User";

                    return (
                      <tr key={file.id}>
                        <Td primary label="File">
                          <div className="min-w-0">
                            <div className="font-medium md:truncate">
                              {file.original_name}
                            </div>
                            <div className="text-muted text-xs md:truncate">
                              {file.storage_key}
                            </div>
                          </div>
                        </Td>

                        <Td label="Type" className="align-top">
                          <StatusBadge>{getFileTypeLabel(file)}</StatusBadge>
                        </Td>

                        <Td label="Size" className="text-muted align-top">
                          {formatBytes(file.size_bytes)}
                        </Td>

                        <Td label="Uploaded By" className="text-muted align-top">
                          {uploaderName}
                        </Td>

                        <Td label="Attached To" className="align-top">
                          <ScopeBadge file={file} />
                        </Td>

                        <Td label="Uploaded" className="text-muted align-top">
                          {formatDate(file.created_at)}
                        </Td>

                        <Td actions label="Actions" className="align-top">
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
                                onClick={() => deleteFile(file.id)}
                                disabled={busyId === file.id}
                                className="btn btn-danger px-3 py-1.5 text-xs"
                              >
                                {busyId === file.id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
            </DataTable>
          )}
        </CollapsibleSection>
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
