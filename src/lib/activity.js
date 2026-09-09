import { formatDateTime } from "@/lib/helper";

const TYPE_ICONS = {
  JOB_CREATED: "🧱",
  JOB_STATUS_CHANGED: "🔄",
  TASK_CREATED: "📝",
  TASK_COMPLETED: "✅",
  TASK_REOPENED: "↩️",
  TASK_UPDATED: "✏️",
  TASK_DELETED: "🗑️",
  FILE_UPLOADED: "📎",
  FILE_DELETED: "🗑️",
  ESTIMATE_CREATED: "🧾",
  ESTIMATE_UPDATED: "✏️",
  ESTIMATE_STATUS_CHANGED: "🔄",
  ESTIMATE_CLIENT_RESPONDED: "✉️",
  ESTIMATE_DELETED: "🗑️",
  ESTIMATE_RESENT_TO_CLIENT: "🔁",
  INVOICE_CREATED: "🧾",
  INVOICE_UPDATED: "✏️",
  INVOICE_STATUS_CHANGED: "🔄",
  INVOICE_DELETED: "🗑️",
  INVOICE_PAID: "💰",
  COMMUNICATION_LOGGED: "💬",
};

function safeMeta(activity) {
  if (!activity?.metadata) return {};
  if (typeof activity.metadata === "object") return activity.metadata;

  try {
    return JSON.parse(activity.metadata);
  } catch {
    return {};
  }
}

/** Human-readable name of the entity this activity refers to (task/job/file/etc). */
export function getActivitySubject(activity, meta = safeMeta(activity)) {
  return (
    meta.taskTitle ||
    meta.jobTitle ||
    meta.estimateTitle ||
    meta.invoiceNumber ||
    meta.fileName ||
    meta.leadName ||
    meta.jobLeadName ||
    null
  );
}

export function getActivityHref(activity) {
  if (!activity?.entity_type || !activity?.entity_id) return null;

  if (activity.entity_type === "lead") return `/leads/${activity.entity_id}`;
  if (activity.entity_type === "job") return `/jobs/${activity.entity_id}`;
  if (activity.entity_type === "task") return `/tasks/${activity.entity_id}`;
  if (activity.entity_type === "file") return `/files`;
  if (activity.entity_type === "estimate") return `/estimates/${activity.entity_id}`;
  if (activity.entity_type === "invoice") return `/invoices/${activity.entity_id}`;
  return null;
}

export function formatActivity(activity) {
  const meta = safeMeta(activity);
  const icon = TYPE_ICONS[activity.type] || "•";
  const subject = getActivitySubject(activity, meta);

  switch (activity.type) {
    case "JOB_CREATED":
      return {
        icon,
        title: "Job created",
        subject: subject || activity.message || null,
        detail: meta.address || null,
        meta: null,
      };

    case "JOB_STATUS_CHANGED":
      return {
        icon,
        title: "Status changed",
        subject,
        detail:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : activity.message || "Job status updated",
        meta: null,
      };

    case "TASK_CREATED":
      return {
        icon,
        title: "Task created",
        subject: subject || activity.message || null,
        detail: meta.dueDate ? `Due ${formatDateTime(meta.dueDate)}` : null,
        meta: meta.jobTitle || meta.leadName || null,
      };

    case "TASK_COMPLETED":
      return {
        icon,
        title: "Task completed",
        subject: subject || activity.message || null,
        detail:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : null,
        meta: meta.jobTitle || meta.leadName || null,
      };

    case "TASK_REOPENED":
      return {
        icon,
        title: "Task reopened",
        subject: subject || activity.message || null,
        detail:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : null,
        meta: meta.jobTitle || meta.leadName || null,
      };

    case "TASK_UPDATED":
      return {
        icon,
        title: activity.title || "Task updated",
        subject: subject || activity.message || null,
        detail:
          meta.fromDueDate || meta.toDueDate
            ? `${meta.fromDueDate ? formatDateTime(meta.fromDueDate) : "No due date"} → ${
                meta.toDueDate ? formatDateTime(meta.toDueDate) : "No due date"
              }`
            : null,
        meta: meta.jobTitle || meta.leadName || null,
      };

    case "TASK_DELETED":
      return {
        icon,
        title: "Task deleted",
        subject: subject || activity.message || null,
        detail: null,
        meta: meta.jobTitle || meta.leadName || null,
      };

    case "FILE_UPLOADED":
      return {
        icon,
        title: "File uploaded",
        subject: subject || activity.message || null,
        detail: meta.mimeType || null,
        meta: null,
      };

    case "FILE_DELETED":
      return {
        icon,
        title: "File deleted",
        subject: subject || activity.message || null,
        detail: meta.mimeType || null,
        meta: null,
      };

    case "ESTIMATE_CREATED":
      return {
        icon,
        title: activity.title || "Estimate Created",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "ESTIMATE_UPDATED":
      return {
        icon,
        title: "Estimate updated",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "ESTIMATE_STATUS_CHANGED":
      return {
        icon,
        title: "Estimate status changed",
        subject,
        detail:
          meta.previousStatus && meta.newStatus
            ? `${meta.previousStatus} → ${meta.newStatus}`
            : activity.message || "Estimate status updated",
        meta: null,
      };

    case "ESTIMATE_CLIENT_RESPONDED":
      return {
        icon,
        title: "Client responded",
        subject: subject || null,
        detail: activity.message || "The client responded to an estimate",
        meta: meta.note || null,
      };

    case "ESTIMATE_DELETED":
      return {
        icon,
        title: "Estimate deleted",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "ESTIMATE_RESENT_TO_CLIENT":
      return {
        icon,
        title: "Estimate resent",
        subject: subject || activity.message || null,
        detail: "Share link refreshed for the client",
        meta: null,
      };

    case "INVOICE_CREATED":
      return {
        icon,
        title: activity.title || "Invoice created",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "INVOICE_UPDATED":
      return {
        icon,
        title: "Invoice updated",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "INVOICE_STATUS_CHANGED":
      return {
        icon,
        title: "Invoice status changed",
        subject,
        detail:
          meta.previousStatus && meta.newStatus
            ? `${meta.previousStatus} → ${meta.newStatus}`
            : activity.message || "Invoice status updated",
        meta: null,
      };

    case "INVOICE_DELETED":
      return {
        icon,
        title: "Invoice deleted",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "INVOICE_PAID":
      return {
        icon,
        title: "Invoice paid",
        subject: subject || activity.message || null,
        detail: null,
        meta: null,
      };

    case "COMMUNICATION_LOGGED":
      return {
        icon,
        title: activity.title || "Communication logged",
        subject: subject || null,
        detail: activity.message || "A conversation was logged",
        meta:
          meta.commType || meta.direction
            ? `${meta.direction || ""} ${meta.commType || ""}`.trim()
            : null,
      };

    default:
      return {
        icon,
        title: activity.title || "Activity",
        subject,
        detail: activity.message || null,
        meta: null,
      };
  }
}

export function formatActivityTimestamp(activity) {
  return formatDateTime(activity.created_at);
}
