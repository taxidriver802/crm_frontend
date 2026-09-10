"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError, EmptyState } from "@/components/error-boundary";
import { Skeleton, StatCardSkeleton } from "@/components/loading/loadingSkeletons";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { GroupedVerticalBars, HorizontalBars } from "@/components/ui/chart";
import { PageToolbar } from "@/components/page-toolbar";
import { Icon } from "@/components/icons";

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

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const [leadRes, estimateRes, jobRes, trendsRes] = await Promise.all([
        api("/reports/lead-funnel"),
        api("/reports/estimate-outcomes"),
        api("/reports/job-pipeline"),
        api("/reports/trends?period=monthly"),
      ]);
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
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
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
    <AppShell
      title="Reports"
      description={loading ? "Loading…" : "Pipeline, estimates, and trends"}
      right={
        <Link href="/reports/product" className="btn px-3 py-2 text-xs">
          Product metrics
        </Link>
      }
    >
      <div className="space-y-6">
        {error ? <PageError message={error} /> : null}

        <PageToolbar
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={loadReports}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              size="metric"
              label="Leads tracked"
              value={leadFunnel.reduce((sum, row) => sum + Number(row.count || 0), 0)}
            />
            <StatCard
              size="metric"
              label="Estimate approval rate"
              value={`${Math.round((estimateOutcomes.approvedRate || 0) * 100)}%`}
            />
            <StatCard
              size="metric"
              label="Approved revenue"
              value={`$${Number(estimateOutcomes.approvedRevenue || 0).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}`}
            />
            <StatCard
              size="metric"
              label="Job stages"
              value={jobPipeline.length}
              sub="Distinct statuses"
            />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard title="Lead funnel">
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars rows={leadFunnel} emptyTitle="No lead data yet" />
            )}
          </SectionCard>

          <SectionCard title="Estimate outcomes">
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars
                rows={(estimateOutcomes.byStatus || []).map((row) => ({
                  status: row.status,
                  count: row.count,
                }))}
                emptyTitle="No estimate data yet"
              />
            )}
          </SectionCard>

          <SectionCard title="Job pipeline">
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <HorizontalBars rows={jobPipeline} emptyTitle="No job data yet" />
            )}
          </SectionCard>
        </div>

        <SectionCard title="Monthly trends">
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : trendSeries.labels.length === 0 ? (
            <EmptyState
              icon={<Icon name="chart" className="h-5 w-5" />}
              title="No trend data yet"
            />
          ) : (
            <GroupedVerticalBars
              labels={trendSeries.labels}
              series={[
                {
                  key: "leads",
                  label: "Leads",
                  values: trendSeries.leadCounts,
                  series: 1,
                },
                {
                  key: "estimates",
                  label: "Estimates",
                  values: trendSeries.estimateCounts,
                  series: 2,
                },
              ]}
            />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
