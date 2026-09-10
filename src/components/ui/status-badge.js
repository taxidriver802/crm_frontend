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

const SIGNAL_CLASS = {
  success: "status-signal-success",
  warning: "status-signal-warning",
  danger: "status-signal-danger",
  info: "status-signal-info",
  neutral: "status-signal-neutral",
  chip: "status-signal-neutral",
};

/**
 * @param {"badge" | "signal"} [appearance="badge"]
 *   `signal` — compact tone dot (label via title / aria-label).
 */
export function StatusBadge({
  status,
  kind,
  tone,
  size = "sm",
  appearance = "badge",
  className = "",
  children,
}) {
  const resolvedTone = tone || (kind ? toneFor(kind, status) : "chip");
  const label = children ?? status ?? "";
  const isChip = resolvedTone === "chip";

  if (appearance === "signal") {
    return (
      <span
        role="img"
        title={String(label)}
        aria-label={String(label)}
        className={cx(
          "status-signal cursor-default",
          SIGNAL_CLASS[resolvedTone] || SIGNAL_CLASS.neutral,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cx(
        isChip
          ? "status-chip"
          : [
              "inline-flex items-center rounded-full border text-[0.6875rem] sm:text-xs",
              size === "md"
                ? "px-2.5 py-1 font-medium"
                : "px-1.5 py-0.5 sm:px-2",
              TONE_CLASS[resolvedTone] || TONE_CLASS.neutral,
            ],
        className,
      )}
    >
      {label}
    </span>
  );
}
