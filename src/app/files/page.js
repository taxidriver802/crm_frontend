"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function getFileTypeLabel(file) {
  if (file.mime_type) return file.mime_type;
  const name = file.original_name || "";
  const parts = name.split(".");
  if (parts.length > 1) return parts.pop().toUpperCase();
  return "Unknown";
}

function buildFileUrl(file) {
  if (!file?.storage_key) return "#";
  return `${API_BASE}/uploads/${file.storage_key}`;
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface rounded-2xl border px-4 py-4 text-left">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function FilesPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

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
      general: files.filter((f) => !f.lead_id && !f.task_id).length,
      leadLinked: files.filter((f) => !!f.lead_id).length,
      taskLinked: files.filter((f) => !!f.task_id).length,
    };
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (scopeFilter === "general" && (file.lead_id || file.task_id)) {
        return false;
      }

      if (scopeFilter === "lead" && !file.lead_id) {
        return false;
      }

      if (scopeFilter === "task" && !file.task_id) {
        return false;
      }

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
          ![".png", ".jpg", ".jpeg", ".webp"].some((ext) => originalName.endsWith(ext))
        ) {
          return false;
        }

        if (typeFilter === "other") {
          const isPdf = mime.includes("pdf") || originalName.endsWith(".pdf");
          const isImage =
            mime.startsWith("image/") ||
            [".png", ".jpg", ".jpeg", ".webp"].some((ext) => originalName.endsWith(ext));

          if (isPdf || isImage) {
            return false;
          }
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

  async function deleteFile(id) {
    const confirmed = window.confirm("Delete this file?");
    if (!confirmed) return;

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
  }

  if (loadingUser) {
    return (
      <AppShell title="Files">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Files"
      right={
        canManageFiles ? (
          <label className="hover:bg-accent-soft inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Files" value={counts.total} />
        <StatCard label="General Files" value={counts.general} />
        <StatCard label="Lead Files" value={counts.leadLinked} />
        {/* <StatCard label="Task Files" value={counts.taskLinked} /> */}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <section className="bg-surface rounded-2xl border">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">File Library</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Browse uploaded files, see metadata, and manage documents in one place.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background w-full rounded-lg border px-3 py-2 text-sm sm:w-56"
            />

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="bg-background rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All Scopes</option>
              <option value="general">General</option>
              <option value="lead">Lead Attached</option>
              {/* <option value="task">Task Attached</option> */}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-background rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {loadingFiles ? (
          <div className="text-muted-foreground px-5 py-6 text-sm">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-muted-foreground px-5 py-6 text-sm">
            No files uploaded yet.
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-muted-foreground px-5 py-8 text-sm">
            No files match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 border-b text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded By</th>
                  <th className="px-5 py-3 font-medium">Attached To</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFiles.map((file) => {
                  const uploaderName =
                    [file.first_name, file.last_name].filter(Boolean).join(" ") ||
                    "Unknown User";

                  return (
                    <tr key={file.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4 align-top">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{file.original_name}</div>
                          <div className="text-muted-foreground truncate text-xs sm:text-sm">
                            {file.storage_key}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium">
                          {getFileTypeLabel(file)}
                        </span>
                      </td>

                      <td className="text-muted-foreground px-5 py-4 align-top">
                        {formatBytes(file.size_bytes)}
                      </td>

                      <td className="text-muted-foreground px-5 py-4 align-top">
                        {uploaderName}
                      </td>

                      <td className="text-muted-foreground px-5 py-4 align-top">
                        {file.lead_id ? (
                          <button
                            onClick={() => router.push(`/leads/${file.lead_id}`)}
                            className="hover:text-main underline underline-offset-4 transition"
                          >
                            Lead #{file.lead_id}
                          </button>
                        ) : file.task_id ? (
                          <span>Task #{file.task_id}</span>
                        ) : (
                          <span>General</span>
                        )}
                      </td>

                      <td className="text-muted-foreground px-5 py-4 align-top">
                        {formatDate(file.created_at)}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={buildFileUrl(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:bg-accent-soft rounded-md border px-3 py-1.5 text-xs"
                          >
                            Open
                          </a>

                          {canManageFiles ? (
                            <button
                              onClick={() => deleteFile(file.id)}
                              disabled={busyId === file.id}
                              className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              {busyId === file.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
