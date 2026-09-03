"use client";

import Link from "next/link";

export function ToggleFormSection({
  title,
  description,
  isOpen,
  onToggle,
  fullFormUrl,
  fullFormLabel = "Full Form",
  openLabel = "+ New",
  closeLabel = "Hide Form",
  children,
  className = "",
  disabled = false,
}) {
  return (
    <section className={`card p-4 ${className}`.trim()}>
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="section-heading">{title}</h3>
          {description ? <p className="text-muted mt-1 text-xs">{description}</p> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {fullFormUrl ? (
            <Link href={fullFormUrl} className="btn btn-sm">
              {fullFormLabel}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className="btn btn-sm"
            aria-expanded={isOpen}
          >
            {isOpen ? closeLabel : openLabel}
          </button>
        </div>
      </div>

      {isOpen ? children : null}
    </section>
  );
}
