"use client";

import { useState } from "react";

export function CollapsibleSection({
  title,
  description,
  actions,
  defaultOpen = true,
  children,
  contentClassName = "",
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card rounded-lg">
      <div className="border-base flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">{title}</div>
          {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="btn px-3 py-2 text-xs"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open ? <div className={`p-4 ${contentClassName}`.trim()}>{children}</div> : null}
    </section>
  );
}
