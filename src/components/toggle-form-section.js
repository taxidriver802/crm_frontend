"use client";

export function ToggleFormSection({
  title,
  description,
  isOpen,
  onToggle,
  openLabel = "+ New",
  closeLabel = "Hide Form",
  children,
  className = "",
  disabled = false,
}) {
  return (
    <section className={`bg-surface border-base rounded-lg border p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {description ? <p className="text-muted mt-1 text-xs">{description}</p> : null}
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="border-base bg-surface hover:bg-accent rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          {isOpen ? closeLabel : openLabel}
        </button>
      </div>

      {isOpen ? <div className="transition-all duration-200">{children}</div> : null}
    </section>
  );
}
