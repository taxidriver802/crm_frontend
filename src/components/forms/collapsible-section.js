"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";

export function CollapsibleSection({
  id,
  title,
  description,
  actions,
  secondaryActions,
  defaultOpen = true,
  empty = false,
  ready = true,
  syncKey,
  children,
  contentClassName = "",
}) {
  const automaticOpen = !ready ? defaultOpen : empty ? false : defaultOpen;
  // null = follow automaticOpen; boolean = user has toggled
  const [userOpen, setUserOpen] = useState(null);
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);

  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setUserOpen(null);
  }

  const open = userOpen === null ? automaticOpen : userOpen;

  function toggleOpen() {
    setUserOpen((prev) => {
      const current = prev === null ? automaticOpen : prev;
      return !current;
    });
  }

  return (
    <section id={id} className="card min-w-0">
      <div
        className={cx(
          "flex min-w-0 flex-wrap items-start justify-between gap-3 p-4",
          open && "border-base border-b",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="section-heading">{title}</div>
          {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
          {actions ? (
            <div
              className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2"
              onClickCapture={() => {
                if (!open) {
                  setUserOpen(true);
                }
              }}
            >
              {actions}
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleOpen}
            className="btn shrink-0 px-3 py-2 text-xs"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open ? (
        <div className={cx("min-w-0 p-4", contentClassName)}>
          {children}
          {secondaryActions ? (
            <div className="mt-4 flex justify-end">{secondaryActions}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
