import Link from "next/link";
import { cx } from "@/lib/cx";

export function StatCard({
  label,
  value,
  sub,
  href,
  onClick,
  active = false,
  size = "default",
  className = "",
}) {
  const compact = size === "compact";
  const metric = size === "metric";

  const inner = (
    <div
      className={cx(
        "text-left transition-colors",
        compact ? "h-full p-3 sm:p-4" : "p-4",
        active ? "card border-transparent bg-accent-soft shadow-sm" : "card",
        (href || onClick) && !active ? "hover:bg-accent" : "",
        className,
      )}
    >
      <div
        className={cx(
          "text-muted",
          compact ? "text-xs sm:text-sm" : metric ? "text-xs" : "text-sm",
        )}
      >
        {label}
      </div>
      <div
        className={cx(
          "font-semibold tracking-tight",
          compact
            ? "mt-1 text-xl sm:mt-2 sm:text-2xl"
            : metric
              ? "mt-1 text-2xl"
              : "mt-2 text-2xl",
        )}
      >
        {value}
      </div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full">
        {inner}
      </button>
    );
  }

  return inner;
}
