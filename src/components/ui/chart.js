import { cx } from "@/lib/cx";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";

function fillClass(series = 1) {
  const n = Number(series);
  if (n === 2) return "chart-fill-2";
  if (n === 3) return "chart-fill-3";
  if (n === 4) return "chart-fill-4";
  return "chart-fill-1";
}

export function ChartLegend({ items = [], className = "" }) {
  if (!items.length) return null;

  return (
    <ul className={cx("chart-legend", className)}>
      {items.map((item) => (
        <li key={item.label} className="chart-legend-item">
          <span
            className={cx("chart-swatch", fillClass(item.series))}
            aria-hidden
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function HorizontalBars({
  rows = [],
  series = 1,
  emptyTitle = "No data yet",
  emptyDescription,
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={<Icon name="chart" className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const max = Math.max(1, ...rows.map((row) => Number(row.count || 0)));

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const count = Number(row.count || 0);
        return (
          <div key={row.status} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{row.status}</span>
              <span className="text-muted">{count}</span>
            </div>
            <div className="chart-track chart-track-h">
              <div
                className={cx("chart-bar", fillClass(series))}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FunnelBars({ steps = [] }) {
  const max = Math.max(1, ...steps.map((step) => Number(step.value || 0)));

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const value = Number(step.value || 0);
        const pct = Math.round((value / max) * 100);
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2">
                <span
                  className={cx("chart-swatch", fillClass(step.series))}
                  aria-hidden
                />
                {step.label}
              </span>
              <span className="font-semibold">{value}</span>
            </div>
            <div className="chart-track chart-track-h-lg">
              <div
                className={cx("chart-bar", fillClass(step.series))}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GroupedVerticalBars({ labels = [], series = [] }) {
  const shown = labels.slice(-6);
  const offset = labels.length - shown.length;
  const allValues = series.flatMap((item) =>
    item.values.slice(offset).map((value) => Number(value || 0)),
  );
  const max = Math.max(1, ...allValues);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2 text-[11px]">
        {shown.map((label, idx) => {
          const i = offset + idx;
          return (
            <div key={label} className="space-y-1">
              <div className="chart-cluster">
                {series.map((item) => {
                  const value = Number(item.values[i] || 0);
                  return (
                    <div
                      key={item.key}
                      className={cx("chart-col", fillClass(item.series))}
                      style={{ height: `${(value / max) * 100}%` }}
                      title={`${item.label}: ${value}`}
                    />
                  );
                })}
              </div>
              <div className="text-muted truncate text-center">{label}</div>
            </div>
          );
        })}
      </div>
      <ChartLegend
        items={series.map((item) => ({
          label: item.label,
          series: item.series,
        }))}
      />
    </div>
  );
}
