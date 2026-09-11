import { cx } from "@/lib/cx";
import { EmptyState } from "@/components/error-boundary";
import { Icon } from "@/components/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function chartColor(config, key) {
  return config?.[key]?.color || "var(--chart-1)";
}

export function ChartContainer({ config = {}, className = "", children }) {
  const style = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      chartColor(config, key),
    ]),
  );

  return (
    <div className={cx("chart-container", className)} style={style}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltipContent({ active, payload = [], label }) {
  if (!active || !payload.length) return null;

  return (
    <div className="chart-tooltip">
      {label ? <div className="chart-tooltip-label">{label}</div> : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="inline-flex items-center gap-2">
              <span
                className="chart-tooltip-dot"
                style={{ background: entry.color }}
                aria-hidden
              />
              {entry.name || entry.dataKey}
            </span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartTooltip({ content = <ChartTooltipContent /> }) {
  return <Tooltip content={content} cursor={false} />;
}

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

  const data = rows.map((row) => ({
    label: row.status,
    count: Number(row.count || 0),
  }));
  const config = {
    count: { label: "Count", color: `var(--chart-${series})` },
  };

  return (
    <ChartContainer config={config} className="h-48 min-h-[192px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
      >
        <CartesianGrid horizontal={false} vertical={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          width={96}
          tick={{ fill: "var(--text)", fontSize: 12 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          name="Count"
          fill={`var(--chart-${series})`}
          radius={4}
          barSize={14}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function FunnelBars({ steps = [] }) {
  const data = steps.map((step) => ({
    label: step.label,
    value: Number(step.value || 0),
    series: step.series,
  }));
  const config = Object.fromEntries(
    steps.map((step) => [
      step.label,
      { label: step.label, color: `var(--chart-${step.series || 1})` },
    ]),
  );

  return (
    <ChartContainer config={config} className="h-52 min-h-[208px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
      >
        <CartesianGrid horizontal={false} vertical={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          width={144}
          tick={{ fill: "var(--text)", fontSize: 14 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" name="Count" radius={4} barSize={18}>
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={`var(--chart-${entry.series || 1})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function GroupedVerticalBars({ labels = [], series = [] }) {
  const shown = labels.slice(-6);
  const offset = labels.length - shown.length;
  const data = shown.map((label, index) => {
    const row = { label };
    series.forEach((item) => {
      row[item.key] = Number(item.values[offset + index] || 0);
    });
    return row;
  });
  const config = Object.fromEntries(
    series.map((item) => [
      item.key,
      {
        label: item.label,
        color: `var(--chart-${item.series || 1})`,
      },
    ]),
  );

  return (
    <ChartContainer config={config} className="h-64 min-h-[256px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        barGap={4}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(5)}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
        />
        <YAxis axisLine={false} tickLine={false} allowDecimals={false} hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={`var(--chart-${item.series || 1})`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
