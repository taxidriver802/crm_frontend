export const PERFORMANCE_WINDOWS = [
  { value: 30, label: "30 days", short: "30d" },
  { value: 90, label: "90 days", short: "90d" },
  { value: 365, label: "365 days", short: "1y" },
];

export function formatPercent(rate) {
  if (rate == null || Number.isNaN(Number(rate))) return "—";
  return `${Math.round(Number(rate) * 100)}%`;
}

export function formatMoney(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDays(days) {
  if (days == null || Number.isNaN(Number(days))) return "—";
  const value = Number(days);
  if (value < 1) return "< 1 day";
  const rounded = Math.round(value);
  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

export function formatHours(hours) {
  if (hours == null || Number.isNaN(Number(hours))) return "—";
  const value = Number(hours);
  if (value < 1) return "< 1 hour";
  const rounded = Math.round(value);
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

export function joinParts(parts) {
  return parts.filter(Boolean).join(" · ");
}

export function countLabel(count, singular) {
  const value = Number(count || 0);
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

export function rateSub(metric, { noun, median, priorLabel = "Previous" } = {}) {
  if (!metric) return "";
  const sample = Number(metric.sample || 0);
  const label = countLabel(sample, (noun || "decisions").replace(/s$/, ""));
  const parts = [label];
  if (median != null) parts.push(`Team median ${formatPercent(median)}`);
  if (metric.priorRate != null) {
    parts.push(`${priorLabel} ${formatPercent(metric.priorRate)}`);
  } else if (metric.priorSample) {
    parts.push(
      `${priorLabel} ${countLabel(metric.priorSample, (noun || "decisions").replace(/s$/, ""))}`,
    );
  }
  return joinParts(parts);
}
