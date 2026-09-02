import { cx } from "@/lib/cx";

export function MetaList({ className = "", children }) {
  return <dl className={cx("space-y-3", className)}>{children}</dl>;
}

export function MetaItem({ label, className = "", children }) {
  return (
    <div className={className}>
      <dt className="kv-label">{label}</dt>
      <dd className="kv-value">{children ?? "—"}</dd>
    </div>
  );
}
