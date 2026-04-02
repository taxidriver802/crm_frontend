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
