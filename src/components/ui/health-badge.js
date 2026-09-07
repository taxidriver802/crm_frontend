import { StatusBadge } from "@/components/ui/status-badge";

const LEVEL_TONE = {
  red: "danger",
  yellow: "warning",
  green: "success",
};

const LEVEL_LABEL = {
  red: "Needs attention",
  yellow: "Watch",
  green: "On track",
};

export function HealthBadge({ health, className = "" }) {
  const level = health?.level;
  if (!level || level === "none") return null;

  const tone = LEVEL_TONE[level] || "neutral";
  const label = LEVEL_LABEL[level] || level;
  const reasons = Array.isArray(health?.reasons) ? health.reasons.filter(Boolean) : [];

  return (
    <span title={reasons.join(", ") || undefined} className={className}>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </span>
  );
}
