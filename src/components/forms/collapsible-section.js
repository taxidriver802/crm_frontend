"use client";

import { useState } from "react";

export function CollapsibleSection({ title, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card rounded-lg">
      <div className="border-base flex items-center justify-between gap-3 border-b p-4">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full min-w-0 items-center justify-between gap-2 text-left"
        >
          <span className="text-sm font-medium">{title}</span>
          <span className="text-muted text-xs">{open ? "Hide" : "Show"}</span>
        </button>

        {right ? <div className="text-sm">{right}</div> : null}
      </div>

      {open ? <div className="p-4">{children}</div> : null}
    </section>
  );
}
