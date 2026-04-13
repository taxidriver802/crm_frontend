"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/loading/loadingSkeletons";

function MetricCard({ label, value, sub }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-muted text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-muted mt-1 text-xs">{sub}</div> : null}
    </div>
  );
}

function HorizontalBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.count || 0)));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.status} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{row.status}</span>
            <span className="text-muted">{row.count}</span>
          </div>
          <div className="h-2 rounded bg-[var(--surface)]">
            <div
              className="h-2 rounded bg-[var(--accent)]"
              style={{ width: `${(Number(row.count || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VerticalBars({ labels, leadCounts, estimateCounts }) {
  const max = Math.max(1, ...leadCounts, ...estimateCounts);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2 text-[11px]">
        {labels.slice(-6).map((label, idx) => {
          const lead = leadCounts.slice(-6)[idx] || 0;
          const estimate = estimateCounts.slice(-6)[idx] || 0;
          return (
            <div key={label} className="space-y-1">
              <div className="flex h-28 items-end gap-1">
                <div
                  className="w-1/2 rounded-t bg-[var(--accent)]"
                  style={{ height: `${(lead / max) * 100}%` }}
                  title={`Leads: ${lead}`}
                />
                <div
                  className="w-1/2 rounded-t bg-green-500/70"
                  style={{ height: `${(estimate / max) * 100}%` }}
                  title={`Estimates: ${estimate}`}
                />
              </div>
              <div className="text-muted truncate text-center">{label}</div>
            </div>
          );
        })}
      </div>
      <div className="text-muted text-xs">Blue: Leads, Green: Estimates</div>
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadFunnel, setLeadFunnel] = useState([]);
  const [estimateOutcomes, setEstimateOutcomes] = useState({
    byStatus: [],
    approvedRevenue: 0,
    approvedRate: 0,
  });
  const [jobPipeline, setJobPipeline] = useState([]);
  const [trends, setTrends] = useState({ leads: [], estimates: [] });

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [leadRes, estimateRes, jobRes, trendsRes] = await Promise.all([
          api("/reports/lead-funnel"),
          api("/reports/estimate-outcomes"),
          api("/reports/job-pipeline"),
          api("/reports/trends?period=monthly"),
        ]);
        if (!alive) return;
        setLeadFunnel(leadRes.data || []);
        setEstimateOutcomes({
          byStatus: estimateRes.byStatus || [],
          approvedRevenue: estimateRes.approvedRevenue || 0,
          approvedRate: estimateRes.approvedRate || 0,
        });
        setJobPipeline(jobRes.data || []);
        setTrends({
          leads: trendsRes.leads || [],
          estimates: trendsRes.estimates || [],
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load reports");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const trendSeries = useMemo(() => {
    const months = Array.from(
      new Set([
        ...(trends.leads || []).map((r) => r.month_key),
        ...(trends.estimates || []).map((r) => r.month_key),
      ]),
    ).sort();

    const leadMap = new Map(
      (trends.leads || []).map((r) => [r.month_key, Number(r.count || 0)]),
    );
    const estimateMap = new Map(
      (trends.estimates || []).map((r) => [r.month_key, Number(r.count || 0)]),
    );

    return {
      labels: months,
      leadCounts: months.map((m) => leadMap.get(m) || 0),
      estimateCounts: months.map((m) => estimateMap.get(m) || 0),
    };
  }, [trends]);

  return (
    <AppShell title="Reports">
      <div className="space-y-6">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Leads tracked"
              value={leadFunnel.reduce((sum, row) => sum + Number(row.count || 0), 0)}
            />
            <MetricCard
              label="Estimate approval rate"
              value={`${Math.round((estimateOutcomes.approvedRate || 0) * 100)}%`}
            />
            <MetricCard
              label="Approved revenue"
              value={`$${Number(estimateOutcomes.approvedRevenue || 0).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}`}
            />
            <MetricCard
              label="Job stages"
              value={jobPipeline.length}
              sub="Distinct statuses"
            />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card rounded-lg p-4">
            <div className="mb-3 text-sm font-semibold">Lead funnel</div>
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars rows={leadFunnel} />
            )}
          </section>

          <section className="card rounded-lg p-4">
            <div className="mb-3 text-sm font-semibold">Estimate outcomes</div>
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars
                rows={(estimateOutcomes.byStatus || []).map((row) => ({
                  status: row.status,
                  count: row.count,
                }))}
              />
            )}
          </section>

          <section className="card rounded-lg p-4">
            <div className="mb-3 text-sm font-semibold">Job pipeline</div>
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars rows={jobPipeline} />
            )}
          </section>
        </div>

        <section className="card rounded-lg p-4">
          <div className="mb-3 text-sm font-semibold">Monthly trends</div>
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : trendSeries.labels.length === 0 ? (
            <div className="text-muted text-sm">No trend data yet.</div>
          ) : (
            <VerticalBars
              labels={trendSeries.labels}
              leadCounts={trendSeries.leadCounts}
              estimateCounts={trendSeries.estimateCounts}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
