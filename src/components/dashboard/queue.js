const KIND_META = {
  task: { label: "Follow-up", tone: "warning" },
  lead: { label: "Lead", tone: "neutral" },
  job: { label: "Job", tone: "warning" },
  estimate: { label: "Estimate", tone: "info" },
  invoice: { label: "Invoice", tone: "info" },
};

export const QUEUE_FILTERS = [
  { id: "all", label: "All", short: "All" },
  { id: "overdue", label: "Overdue", short: "Late" },
  { id: "today", label: "Today", short: "Today" },
  { id: "waiting", label: "Waiting", short: "Wait" },
  { id: "money", label: "Invoices", short: "Bills" },
  { id: "pipeline", label: "Pipeline", short: "Pipe" },
];

export function actionKey(item) {
  if (!item || item.id == null || !item.kind) return null;
  return `${item.kind}:${item.id}`;
}

export function mergeActions(...lists) {
  const seen = new Set();
  const out = [];

  for (const list of lists) {
    for (const item of Array.isArray(list) ? list : []) {
      const key = actionKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }

  return out;
}

export function kindMeta(item) {
  const base = KIND_META[item?.kind] || { label: "Item", tone: "neutral" };
  if (isOverdueItem(item)) return { ...base, tone: "danger" };
  return base;
}

export function isOverdueItem(item) {
  const reason = String(item?.reason || "").toLowerCase();
  return reason.includes("overdue");
}

export function matchesQueueFilter(item, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "overdue") return isOverdueItem(item);
  if (filter === "today") return item?.reason === "Due today";
  if (filter === "waiting") return item?.kind === "estimate";
  if (filter === "money") return item?.kind === "invoice";
  if (filter === "pipeline") return item?.kind === "lead" || item?.kind === "job";
  return true;
}

export function formatActionWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greetingFor(firstName) {
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${hello}, ${firstName}` : hello;
}

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
