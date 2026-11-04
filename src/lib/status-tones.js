const STATUS_TONE = {
  invoice: {
    Draft: "neutral",
    Sent: "info",
    "Partially Paid": "warning",
    Paid: "success",
    Overdue: "danger",
    Void: "neutral",
  },
  estimate: {
    Draft: "neutral",
    Sent: "info",
    Approved: "success",
    Rejected: "danger",
  },
  task: {
    Completed: "success",
    Pending: "warning",
  },
  user: {
    Active: "success",
    Pending: "warning",
    Expired: "danger",
    Disabled: "danger",
    Revoked: "neutral",
  },
  job: {
    New: "info",
    Contacted: "info",
    "Appointment Scheduled": "info",
    "Proposal Sent": "warning",
    Sold: "success",
    "Work Scheduled": "info",
    "In Progress": "info",
    "Work Complete": "warning",
    Closed: "success",
    Lost: "danger",
  },
  lead: {
    New: "info",
    Contacted: "warning",
    Qualified: "success",
    Closed: "neutral",
    Inactive: "neutral",
  },
};

export function toneFor(kind, status) {
  if (!kind || status == null || status === "") return "neutral";
  const map = STATUS_TONE[kind];
  if (!map) return "neutral";
  if (map[status]) return map[status];
  const match = Object.keys(map).find(
    (key) => key.toLowerCase() === String(status).toLowerCase(),
  );
  return match ? map[match] : "neutral";
}
