import { cx } from "@/lib/cx";

export function SectionCard({
  title,
  description,
  right,
  children,
  className = "",
  size = "sm",
}) {
  return (
    <section className={cx("card", className)}>
      <div className="border-base flex min-w-0 flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className={size === "lg" ? "section-heading" : "text-sm font-medium"}>
            {title}
          </div>
          {description ? (
            <p className="text-muted mt-1 text-sm">{description}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0 text-sm">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
