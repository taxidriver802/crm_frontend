import { cx } from "@/lib/cx";
import { toneFor } from "@/lib/status-tones";

const TONE_CLASS = {
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  info: "tone-info",
  neutral: "tone-neutral",
  chip: "status-chip",
};

export function StatusBadge({
  status,
  kind,
  tone,
  size = "sm",
  className = "",
  children,
}) {
  const resolvedTone = tone || (kind ? toneFor(kind, status) : "chip");
  const label = children ?? status ?? "";
  const isChip = resolvedTone === "chip";

  return (
    <span
      className={cx(
        isChip
          ? "status-chip"
          : [
              "inline-flex items-center rounded-full border text-xs",
              size === "md" ? "px-2.5 py-1 font-medium" : "px-2 py-0.5",
              TONE_CLASS[resolvedTone] || TONE_CLASS.neutral,
            ],
        className,
      )}
    >
      {label}
    </span>
  );
}
