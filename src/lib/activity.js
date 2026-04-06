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

export function getActivityHref(activity) {
  if (!activity?.entity_type || !activity?.entity_id) return null;

  if (activity.entity_type === "lead") return `/leads/${activity.entity_id}`;
  if (activity.entity_type === "job") return `/jobs/${activity.entity_id}`;
  if (activity.entity_type === "task") return `/tasks/${activity.entity_id}`;
  return null;
}

export function formatActivity(activity) {
  const meta = safeMeta(activity);
  const icon = TYPE_ICONS[activity.type] || "•";

  switch (activity.type) {
    case "JOB_CREATED":
      return {
        icon,
        title: "Job created",
        detail: meta.jobTitle || activity.message || "A job was created",
        meta: meta.address || null,
      };

    case "JOB_STATUS_CHANGED":
      return {
        icon,
        title: "Status changed",
        detail:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : activity.message || "Job status updated",
        meta: meta.jobTitle || null,
      };

    case "TASK_CREATED":
      return {
        icon,
        title: "Task created",
        detail: meta.taskTitle || activity.message || "A task was created",
        meta: meta.dueDate ? `Due ${formatDateTime(meta.dueDate)}` : null,
      };

    case "TASK_COMPLETED":
      return {
        icon,
        title: "Task completed",
        detail: meta.taskTitle || activity.message || "A task was completed",
        meta:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : null,
      };

    case "TASK_REOPENED":
      return {
        icon,
        title: "Task reopened",
        detail: meta.taskTitle || activity.message || "A task was reopened",
        meta:
          meta.fromStatus && meta.toStatus
            ? `${meta.fromStatus} → ${meta.toStatus}`
            : null,
      };

    case "TASK_UPDATED":
      return {
        icon,
        title: activity.title || "Task updated",
        detail: meta.taskTitle || activity.message || "Task updated",
        meta:
          meta.fromDueDate || meta.toDueDate
            ? `${meta.fromDueDate ? formatDateTime(meta.fromDueDate) : "No due date"} → ${
                meta.toDueDate ? formatDateTime(meta.toDueDate) : "No due date"
              }`
            : null,
      };

    case "TASK_DELETED":
      return {
        icon,
        title: "Task deleted",
        detail: meta.taskTitle || activity.message || "A task was deleted",
        meta: null,
      };

    case "FILE_UPLOADED":
      return {
        icon,
        title: "File uploaded",
        detail: meta.fileName || activity.message || "A file was uploaded",
        meta: meta.mimeType || null,
      };

    case "FILE_DELETED":
      return {
        icon,
        title: "File deleted",
        detail: meta.fileName || activity.message || "A file was deleted",
        meta: meta.mimeType || null,
      };

    default:
      return {
        icon,
        title: activity.title || "Activity",
        detail: activity.message || null,
        meta: null,
      };
  }
}

export function formatActivityTimestamp(activity) {
  return formatDateTime(activity.created_at);
}
