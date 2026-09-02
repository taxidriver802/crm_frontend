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
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cx("seg-btn", selected && "seg-btn-active")}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.short ? (
              <>
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.short}</span>
              </>
            ) : (
              opt.label
            )}
          </button>
        );
      })}
    </div>
  );
}
