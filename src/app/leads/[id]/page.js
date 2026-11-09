"use client";

import { Alert } from "@/components/ui/alert";
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
import { SectionCard } from "@/components/ui/section-card";
import { formatWholeDollarDisplay } from "@/lib/input-format";
import { PeekLink } from "@/components/peek/peek-provider";
import { ContactLinks, DetailList, HealthDot, RecordUnavailable, StatusPill } from "@/components/records/record-bits";
import {
  RailPanel,
  SectionArranger,
  TabPanel,
  Tabs,
  useRecordSections,
  useUrlTab,
} from "@/components/records/record-layout";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Icon } from "@/components/icons";
import { formatMoney } from "@/lib/job-lifecycle";

const LEAD_TABS = ["overview", "jobs", "work", "files"];
const LEAD_SECTIONS = [
  { id: "conversation", label: "Conversation" },
  { id: "jobs", label: "Jobs" },
  { id: "notes", label: "Intake notes" },
];

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
  const [tab, setTab] = useUrlTab("overview", LEAD_TABS);
  const layout = useRecordSections("lead", LEAD_SECTIONS);
  const workspace = useWorkspace();

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
  const [loadError, setLoadError] = useState(null);
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
        setLoadError(null);
      } catch (e) {
        if (!alive) return;
        setLoadError(e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    async function loadLeadTasks() {
      try {
        setLoadingTasks(true);
        setTasksError("");
        const res = await api(`/tasks?leadId=${id}&limit=50&offset=0&view=all`);
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

        const res = await api(`/jobs?leadId=${id}&limit=50&offset=0&view=all`);
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
    : "Lead";

  return (
    <AppShell title={leadName} description={lead?.service_type || undefined}>
      <div className="min-w-0 space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}
        {success ? (
          <Alert variant="inline" tone="success">
            {success}
          </Alert>
        ) : null}

        {loading ? (
          <section className="record-head">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-4 w-64" />
          </section>
        ) : !lead ? (
          <RecordUnavailable
            noun="lead"
            error={loadError}
            listHref="/leads"
            listLabel="Leads"
            onRetry={() => window.location.reload()}
          />
        ) : (
          <>
            <section className="record-head" data-testid="lead-head">
              <div className="record-head-top">
                <div className="min-w-0 space-y-2">
                  <div className="record-meta">
                    <StatusPill kind="lead" status={lead.status} />
                    {formatDaysInStatus(lead.status_changed_at) ? (
                      <span>{formatDaysInStatus(lead.status_changed_at)}</span>
                    ) : null}
                    {lead.source ? <span className="tag">{lead.source}</span> : null}
                    {lead.urgency ? <span className="tag">Urgency: {lead.urgency}</span> : null}
                    <span>
                      Owner{" "}
                      <span className="text-main">
                        {lead.assigned_user
                          ? `${lead.assigned_user.first_name || ""} ${lead.assigned_user.last_name || ""}`.trim()
                          : "Unassigned"}
                      </span>
                    </span>
                  </div>
                  <ContactLinks phone={lead.phone} email={lead.email} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/jobs/new?lead_id=${id}`} className="btn btn-primary btn-sm">
                    <Icon name="briefcase" className="h-3.5 w-3.5" />
                    New job
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm"
                    aria-pressed={workspace.isPinned("lead", lead.id)}
                    onClick={() =>
                      workspace.togglePin({ kind: "lead", id: lead.id, label: leadName, href: `/leads/${lead.id}` })
                    }
                  >
                    <Icon name="pin" className="h-3.5 w-3.5" />
                    {workspace.isPinned("lead", lead.id) ? "Pinned" : "Pin"}
                  </button>
                  <Link href={`/leads/${id}/edit`} className="btn btn-sm">
                    Edit
                  </Link>
                  <DetailMoreMenu label="More">
                    <DetailMoreMenuItem as={Link} href={`/tasks/new?lead_id=${id}`} className="text-main">
                      New task
                    </DetailMoreMenuItem>
                    <DetailMoreMenuItem
                      as={Link}
                      href={`/tasks/new?lead_id=${id}&kind=appointment`}
                      className="text-main"
                    >
                      Schedule a visit
                    </DetailMoreMenuItem>
                    <DetailMoreMenuItem type="button" className="text-danger" onClick={handleDeleteLead}>
                      Delete lead
                    </DetailMoreMenuItem>
                  </DetailMoreMenu>
                </div>
              </div>
            </section>

            <div className={layout.railVisible ? "record-grid" : "record-grid record-grid-norail"}>
              <div className="record-main">
                <Tabs
                  label="Lead sections"
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { id: "overview", label: "Overview" },
                    { id: "jobs", label: "Jobs", count: jobs.length },
                    { id: "work", label: "Work", count: openTasks.length },
                    { id: "files", label: "Files", count: files.length },
                  ]}
                />
                <TabPanel id="overview" active={tab === "overview"}>
                  <div className="flex justify-end">
                    <SectionArranger
                      sections={layout.sections}
                      setSections={layout.setSections}
                      reset={layout.reset}
                      label="Arrange lead overview"
                    />
                  </div>
                  {layout.sections
                    .filter((section) => !section.hidden)
                    .map((section) => {
                      if (section.id === "conversation") {
                        return (
                          <div key="conversation">
                            <SectionCard
                              size="lg"
                              title="Communication"
                              description="Call notes, decisions, and context for this lead."
                            >
                              <NotesSection entityType="lead" entityId={id} onLoadState={setNotesLoadState} />
                            </SectionCard>
                          </div>
                        );
                      }
                      if (section.id === "jobs") {
                        return (
                          <div key="jobs">
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
                                <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
                                  No jobs for this lead yet.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {jobs.map((job) => (
                                    <PeekLink
                                      key={job.id}
                                      kind="job"
                                      id={job.id}
                                      className="list-row list-row-interactive block"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="font-medium">{job.title}</div>
                                          <div className="text-sm text-muted">{job.address ?? "—"}</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <HealthDot health={job.health} />
                                          <StatusPill kind="job" status={job.status} />
                                        </div>
                                      </div>
                                    </PeekLink>
                                  ))}
                                </div>
                              )}
                            </SectionCard>
                          </div>
                        );
                      }
                      if (section.id === "notes") {
                        return lead.notes ? (
                          <section key="notes" className="panel">
                            <div className="panel-head">
                              <h2 className="panel-title">Intake notes</h2>
                            </div>
                            <p className="panel-body whitespace-pre-wrap text-sm">{lead.notes}</p>
                          </section>
                        ) : null;
                      }
                      return null;
                    })}
                </TabPanel>
                <TabPanel id="jobs" active={tab === "jobs"}>
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
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
                      No jobs for this lead yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <PeekLink
                          key={job.id}
                          kind="job"
                          id={job.id}
                          className="list-row list-row-interactive block"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-muted">{job.address ?? "—"}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <HealthDot health={job.health} />
                              <StatusPill kind="job" status={job.status} />
                            </div>
                          </div>
                        </PeekLink>
                      ))}
                    </div>
                  )}
                </SectionCard>
                </TabPanel>
                <TabPanel id="work" active={tab === "work"}>
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
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
                      No tasks for this lead yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...openTasks, ...completedTasks].map((task) => (
                        <PeekLink
                          key={task.id}
                          kind="task"
                          id={task.id}
                          className={`list-row list-row-interactive block ${
                            isCompletedTask(task) ? "opacity-85" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{task.title}</div>
                              <div className="mt-1 text-sm text-muted">
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
                        </PeekLink>
                      ))}
                    </div>
                  )}
                </SectionCard>
                </TabPanel>
                <TabPanel id="files" active={tab === "files"}>
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
                          capture="environment"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    ) : null
                  }
                >
                  {filesError ? (
                    <Alert variant="inline" className="mb-3">
                      {filesError}
                    </Alert>
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
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
                      No files attached to this lead yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div key={file.id} className="list-row list-row-split">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{file.original_name}</div>
                            <div className="mt-1 text-xs text-muted">
                              {file.mime_type || "Unknown type"} • {formatBytes(file.size_bytes)}
                            </div>
                            <div className="mt-1 text-xs text-muted">
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
                </TabPanel>
              </div>

              {layout.railVisible ? (
                <aside className="record-rail" aria-label="Lead details">
                  <RailPanel title="Contact">
                    <div className="font-medium">{leadName}</div>
                    <ContactLinks phone={lead.phone} email={lead.email} />
                    {lead.preferred_contact_method ? (
                      <p className="text-xs text-muted">Prefers {lead.preferred_contact_method}</p>
                    ) : null}
                  </RailPanel>
                  <RailPanel title="Qualification">
                    <DetailList
                      items={[
                        { label: "Service", value: lead.service_type },
                        { label: "Source", value: lead.source },
                        { label: "Urgency", value: lead.urgency },
                        {
                          label: "Budget",
                          value:
                            lead.budget_min != null || lead.budget_max != null
                              ? `${lead.budget_min != null ? formatWholeDollarDisplay(lead.budget_min) : "—"} – ${
                                  lead.budget_max != null ? formatWholeDollarDisplay(lead.budget_max) : "—"
                                }`
                              : null,
                        },
                      ]}
                    />
                  </RailPanel>
                  <RailPanel title="Work with us">
                    <DetailList
                      items={[
                        { label: "Jobs", value: String(jobs.length) },
                        {
                          label: "Contract value",
                          value: formatMoney(jobs.reduce((sum, j) => sum + Number(j.money?.contract_total || 0), 0)),
                        },
                        {
                          label: "Owed",
                          value: formatMoney(jobs.reduce((sum, j) => sum + Number(j.money?.outstanding_total || 0), 0)),
                        },
                        { label: "Open tasks", value: String(openTasks.length) },
                        { label: "Created", value: formatDate(lead.created_at) },
                      ]}
                    />
                  </RailPanel>
                </aside>
              ) : null}
            </div>
          </>
        )}

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
