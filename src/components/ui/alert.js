import { cx } from "@/lib/cx";

const TONE_CLASS = {
  danger: "tone-danger",
  success: "tone-success",
  warning: "tone-warning",
  info: "tone-info",
  neutral: "tone-neutral",
};

const INLINE_TEXT = {
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
  info: "text-accent",
  neutral: "text-muted",
};

export function Alert({
  tone = "danger",
  variant = "banner",
  className = "",
  children,
}) {
  if (children == null || children === false) return null;

  if (variant === "inline") {
    return (
      <div className={cx("text-sm", INLINE_TEXT[tone] || INLINE_TEXT.danger, className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cx(
        "rounded-theme-md border px-3 py-2 text-sm",
        TONE_CLASS[tone] || TONE_CLASS.danger,
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
