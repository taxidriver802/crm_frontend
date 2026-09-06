import { cx } from "@/lib/cx";

export function FilterBar({ children, actions, footer, className = "" }) {
  return (
    <section className={cx("card p-4", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-end">
            {children}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
        {footer ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
