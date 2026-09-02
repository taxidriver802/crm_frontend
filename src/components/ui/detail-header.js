import { cx } from "@/lib/cx";

export function DetailHeader({
  title,
  subtitle,
  badges,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={cx("card p-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {title ? <h1 className="page-title text-xl md:text-2xl">{title}</h1> : null}
          {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
          {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
        </div>
        {actions ? <div className="page-actions shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4 space-y-4">{children}</div> : null}
    </section>
  );
}
