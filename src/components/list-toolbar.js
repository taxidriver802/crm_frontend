"use client";

import { cx } from "@/lib/cx";

export function ListToolbar({ left, right, className = "" }) {
  return (
    <section className={cx("card p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{left}</div>
        {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
      </div>
    </section>
  );
}
