"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError } from "@/components/error-boundary";
import { Skeleton, StatCardSkeleton } from "@/components/loading/loadingSkeletons";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Segmented } from "@/components/ui/segmented";
import { ListRow } from "@/components/ui/list-row";
import { FunnelBars } from "@/components/ui/chart";
import { PageToolbar } from "@/components/page-toolbar";
import { Icon } from "@/components/icons";

const FUNNEL_STEPS = [
  { key: "leads_created", label: "Leads created", series: 1 },
  { key: "estimates_approved", label: "Estimates approved", series: 2 },
  { key: "invoices_created", label: "Invoices created", series: 3 },
  { key: "invoices_paid", label: "Invoices paid", series: 4 },
];

export default function ProductMetricsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/product-metrics/summary?days=${days}`);
      setData(res);
    } catch (e) {
      setError(e?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const funnel = data?.funnel || {};
  const automation = data?.automation || {};
  const counts = data?.counts || [];

  return (
    <AppShell
      title="Product metrics"
      description="Internal usage and conversion insights."
      right={
        <Link href="/reports" className="btn px-3 py-2 text-xs">
          Reports
        </Link>
      }
    >
      <div className="space-y-6">
        <Segmented
          aria-label="Metrics window"
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: "7 days", short: "7d" },
            { value: 30, label: "30 days", short: "30d" },
            { value: 90, label: "90 days", short: "90d" },
          ]}
        />

        {error ? <PageError message={error} onRetry={loadData} /> : null}

        <PageToolbar
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
        />

        {loading ? (
          <>
            <SectionCard title={`Conversion funnel (${days} days)`}>
              <Skeleton className="h-40 w-full" />
            </SectionCard>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionCard title={`Conversion funnel (${days} days)`}>
              <FunnelBars
                steps={FUNNEL_STEPS.map((step) => ({
                  label: step.label,
                  value: funnel[step.key] || 0,
                  series: step.series,
                }))}
              />
            </SectionCard>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                size="metric"
                label="Automation fires"
                value={automation.triggered || 0}
                sub={`Last ${days} days`}
              />
              <StatCard
                size="metric"
                label="Portal views"
                value={automation.portal_views || 0}
                sub={`Last ${days} days`}
              />
              <StatCard
                size="metric"
                label="QB sync success"
                value={automation.qb_success || 0}
                sub={`Last ${days} days`}
              />
              <StatCard
                size="metric"
                label="QB sync failed"
                value={automation.qb_failed || 0}
                sub={`Last ${days} days`}
              />
            </div>

            {counts.length > 0 ? (
              <SectionCard title={`All events (${days} days)`}>
                <div className="space-y-2">
                  {counts.map((row) => (
                    <ListRow
                      key={row.event_name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted">{row.event_name}</span>
                      <span className="font-semibold">{row.count}</span>
                    </ListRow>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
