import { cx } from "@/lib/cx";

export function Segmented({
  value,
  onChange,
  options = [],
  className = "",
  "aria-label": ariaLabel,
}) {
  return (
    <div className={cx("seg", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = value === opt.value;
        const hasCount = opt.count != null;
        const label = opt.short ? (
          <>
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </>
        ) : (
          opt.label
        );

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={hasCount ? `${opt.label} ${opt.count}` : undefined}
            className={cx("seg-btn", selected && "seg-btn-active")}
            onClick={() => onChange?.(opt.value)}
          >
            {label}
            {hasCount ? (
              <span
                className={cx(
                  "seg-count",
                  opt.countTone === "danger" && "seg-count-danger",
                  opt.countTone === "warning" && "seg-count-warning",
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
