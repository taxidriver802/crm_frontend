import Link from "next/link";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function getFileTypeLabel(file) {
  if (file?.mime_type) return file.mime_type;
  const name = file?.original_name || "";
  const parts = name.split(".");
  if (parts.length > 1) return parts.pop().toUpperCase();
  return "Unknown";
}

export function buildFileUrl(file) {
  if (!file?.storage_key) return "#";
  return `${API_BASE}/uploads/${file.storage_key}`;
}

export function getFileExtension(file) {
  const name = file?.original_name || "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function getPreviewKind(file) {
  const mime = String(file?.mime_type || "").toLowerCase();
  const ext = getFileExtension(file);

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return "image";
  }

  if (mime.includes("pdf") || ext === "pdf") {
    return "pdf";
  }

  if (mime.startsWith("text/") || ["md", "txt", "json", "csv"].includes(ext)) {
    return "text";
  }

  return "none";
}

export function isPreviewableFile(file) {
  return getPreviewKind(file) !== "none";
}

export function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function formatDue(dueDate) {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "Invalid date";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getLinkedEntity(task) {
  if (task?.job) {
    return {
      label: task.job.title || `Job #${task.job.id}`,
      href: `/jobs/${task.job.id}`,
      kind: "Job",
    };
  }

  if (task?.lead) {
    return {
      label: task.lead.name || `Lead #${task.lead.id}`,
      href: `/leads/${task.lead.id}`,
      kind: "Lead",
    };
  }

  // fallback for legacy data
  if (task?.job_id) {
    return {
      label: task.job_title || `Job #${task.job_id}`,
      href: `/jobs/${task.job_id}`,
      kind: "Job",
    };
  }

  if (task?.lead_id) {
    const leadName =
      task.lead_first_name && task.lead_last_name
        ? `${task.lead_first_name} ${task.lead_last_name}`
        : `Lead #${task.lead_id}`;

    return {
      label: leadName,
      href: `/leads/${task.lead_id}`,
      kind: "Lead",
    };
  }

  return {
    label: "Unlinked",
    href: null,
    kind: null,
  };
}

export function LinkedEntityCell({ task }) {
  const linked = getLinkedEntity(task);

  if (!linked.href) {
    return <span className="text-muted">{linked.label}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-muted text-xs">{linked.kind}</span>
      <Link className="underline underline-offset-4 hover:opacity-80" href={linked.href}>
        {linked.label}
      </Link>
    </div>
  );
}
