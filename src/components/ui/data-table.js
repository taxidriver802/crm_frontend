import { cx } from "@/lib/cx";

/**
 * Desktop table that becomes labeled stacked cards below the `md` breakpoint.
 * Pass `label` / `primary` / `actions` / `empty` on `Td` so mobile cards keep
 * the same information without a second markup tree.
 */
export function DataTable({ children, className = "" }) {
  return (
    <div className={cx("data-table-stack scrollbar-theme md:overflow-x-auto", className)}>
      <table className="data-table">{children}</table>
    </div>
  );
}

export function Td({
  label,
  primary = false,
  actions = false,
  empty = false,
  className = "",
  children,
  ...props
}) {
  return (
    <td
      className={className}
      data-label={label || undefined}
      {...(primary ? { "data-primary": "" } : {})}
      {...(actions ? { "data-actions": "" } : {})}
      {...(empty ? { "data-empty": "" } : {})}
      {...props}
    >
      {children}
    </td>
  );
}
