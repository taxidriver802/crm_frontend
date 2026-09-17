import { cx } from "@/lib/cx";

export function SectionCard({
  id,
  title,
  description,
  right,
  children,
  className = "",
  size = "sm",
  collapsed = false,
}) {
  return (
    <section id={id} className={cx("card", className)}>
      <div
        className={cx(
          "flex min-w-0 flex-wrap items-start justify-between gap-3 p-4",
          !collapsed && "border-b border-base",
        )}
      >
        <div className="min-w-0">
          <div className={size === "lg" ? "section-heading" : "text-sm font-medium"}>
            {title}
          </div>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {right ? (
          <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-2 text-sm">
            {right}
          </div>
        ) : null}
      </div>
      {collapsed ? null : <div className="p-4">{children}</div>}
    </section>
  );
}
