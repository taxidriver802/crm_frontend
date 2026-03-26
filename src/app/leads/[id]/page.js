"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function buildFileUrl(file) {
  if (!file?.storage_key) return "#";
  return `${API_BASE}/uploads/${file.storage_key}`;
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);

  const [error, setError] = useState("");
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

  return (
    <AppShell title={`Lead #${id}`}>
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <div className="bg-surface border-base rounded-lg border p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : !lead ? (
            <div className="text-muted-foreground text-sm">Not found.</div>
          ) : (
            <div className="flex flex-row gap-6">
              <div className="space-y-2">
                <div className="text-xl font-semibold">
                  {lead.first_name} {lead.last_name}
                </div>
                <div className="text-muted-foreground text-sm">
                  {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {lead.status ?? "—"}
                  </span>
                  {lead.source ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      {lead.source}
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
                className="ml-auto flex h-8 w-8 items-center justify-center rounded border p-1"
                onClick={handleDeleteLead}
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

        <div className="flex justify-between">
          <div className="flex gap-2">
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
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading ? "Uploading..." : "Upload to Lead"}
              </label>
            ) : null}
          </div>

          {filesError ? (
            <div className="px-4 pt-4 text-sm text-red-500">{filesError}</div>
          ) : null}

          {success ? (
            <div className="px-4 pt-4 text-sm text-green-600">{success}</div>
          ) : null}

          {loadingFiles ? (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              No files attached to this lead yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent-soft">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Uploaded By</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {files.map((file) => {
                    const uploaderName =
                      [file.first_name, file.last_name].filter(Boolean).join(" ") ||
                      "Unknown User";

                    return (
                      <tr
                        key={file.id}
                        className="border-base hover:bg-accent-soft border-t transition"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{file.original_name}</div>
                          <div className="text-muted mt-1 text-xs">
                            {file.storage_key}
                          </div>
                        </td>

                        <td className="px-4 py-3">{file.mime_type || "—"}</td>
                        <td className="px-4 py-3">{formatBytes(file.size_bytes)}</td>
                        <td className="px-4 py-3">{uploaderName}</td>
                        <td className="px-4 py-3">{formatDate(file.created_at)}</td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={buildFileUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-4 hover:opacity-80"
                            >
                              Open
                            </a>

                            {canManageFiles ? (
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                disabled={busyFileId === file.id}
                                className="text-red-600 underline underline-offset-4 hover:opacity-80"
                              >
                                {busyFileId === file.id ? "Deleting..." : "Delete"}
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
      </div>
    </AppShell>
  );
}
