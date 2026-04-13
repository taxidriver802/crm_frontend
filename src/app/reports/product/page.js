"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import Link from "next/link";

function MetricCard({ label, value, sub }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-muted text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );
}

function FunnelBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="bg-surface h-3 overflow-hidden rounded-full">
        <div
          className="bg-accent-solid h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
  }, [days]);

  const funnel = data?.funnel || {};
  const automation = data?.automation || {};
  const counts = data?.counts || [];

  const funnelMax = Math.max(
    funnel.leads_created || 0,
    funnel.estimates_approved || 0,
    funnel.invoices_created || 0,
    funnel.invoices_paid || 0,
    1,
  );

  return (
    <AppShell
      title="Product Metrics"
      description="Internal usage and conversion insights."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/reports" className="text-muted text-sm hover:underline">
            ← Reports
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              className={`btn px-3 py-2 text-xs ${days === d ? "bg-accent text-main" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>

        {error ? <PageError message={error} onRetry={loadData} /> : null}

        {loading ? (
          <SectionSkeleton rows={4} />
        ) : (
          <>
            <section className="card rounded-lg p-4">
              <div className="mb-4 font-medium">Conversion Funnel ({days} days)</div>
              <div className="space-y-3">
                <FunnelBar
                  label="Leads Created"
                  value={funnel.leads_created || 0}
                  max={funnelMax}
                />
                <FunnelBar
                  label="Estimates Approved"
                  value={funnel.estimates_approved || 0}
                  max={funnelMax}
                />
                <FunnelBar
                  label="Invoices Created"
                  value={funnel.invoices_created || 0}
                  max={funnelMax}
                />
                <FunnelBar
                  label="Invoices Paid"
                  value={funnel.invoices_paid || 0}
                  max={funnelMax}
                />
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Automation Fires"
                value={automation.triggered || 0}
                sub={`Last ${days} days`}
              />
              <MetricCard
                label="Portal Views"
                value={automation.portal_views || 0}
                sub={`Last ${days} days`}
              />
              <MetricCard
                label="QB Sync Success"
                value={automation.qb_success || 0}
                sub={`Last ${days} days`}
              />
              <MetricCard
                label="QB Sync Failed"
                value={automation.qb_failed || 0}
                sub={`Last ${days} days`}
              />
            </div>

            {counts.length > 0 ? (
              <section className="card rounded-lg p-4">
                <div className="mb-3 font-medium">All Events ({days} days)</div>
                <div className="space-y-2">
                  {counts.map((row) => (
                    <div
                      key={row.event_name}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <span className="text-muted">{row.event_name}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
