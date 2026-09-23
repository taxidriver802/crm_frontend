export const NOTIFICATION_PANEL_LIMIT = 8;
export const NOTIFICATIONS_CHANGED_EVENT = "crm:notifications-changed";

export function emitNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

export function buildNotificationsQuery({ limit, offset = 0, unreadOnly = false } = {}) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  if (unreadOnly) params.set("unreadOnly", "true");
  const query = params.toString();
  return query ? `/notifications?${query}` : "/notifications";
}

export function getNotificationHref(notification) {
  if (!notification) return null;

  if (notification.entity_type === "task" && notification.entity_id) {
    return `/tasks/${notification.entity_id}`;
  }

  if (notification.entity_type === "lead" && notification.entity_id) {
    return `/leads/${notification.entity_id}`;
  }

  if (notification.entity_type === "job" && notification.entity_id) {
    return `/jobs/${notification.entity_id}`;
  }

  if (notification.entity_type === "estimate" && notification.entity_id) {
    return `/estimates/${notification.entity_id}`;
  }

  if (notification.entity_type === "invoice" && notification.entity_id) {
    return `/invoices/${notification.entity_id}`;
  }

  if (notification.type === "FILE_UPLOADED" && !notification.entity_type) {
    return "/files";
  }

  return null;
}

export function getNotificationIconName(notification) {
  if (!notification) return "bell";

  switch (notification.entity_type) {
    case "task":
      return "checklist";
    case "lead":
      return "users";
    case "job":
      return "briefcase";
    case "estimate":
    case "invoice":
      return "invoice";
    case "invite":
      return "userPlus";
    default:
      break;
  }

  if (notification.type === "FILE_UPLOADED") return "folder";
  return "bell";
}

export function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function notificationDayGroup(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfToday.getTime() - start.getTime()) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
}
