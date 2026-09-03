"use client";

import { cx } from "@/lib/cx";

export function ListToolbar({ left, right, className = "" }) {
  return (
    <section className={cx("card p-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div>
        {right ? <div className="flex min-w-0 flex-wrap items-center gap-2">{right}</div> : null}
      </div>
    </section>
  );
}
