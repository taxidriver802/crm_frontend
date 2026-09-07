import { cx } from "@/lib/cx";

export function SectionCard({
  title,
  description,
  right,
  children,
  className = "",
  size = "sm",
  collapsed = false,
}) {
  return (
    <section className={cx("card", className)}>
      <div
        className={cx(
          "flex min-w-0 flex-wrap items-start justify-between gap-3 p-4",
          !collapsed && "border-base border-b",
        )}
      >
        <div className="min-w-0">
          <div className={size === "lg" ? "section-heading" : "text-sm font-medium"}>
            {title}
          </div>
          {description ? (
            <p className="text-muted mt-1 text-sm">{description}</p>
          ) : null}
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
