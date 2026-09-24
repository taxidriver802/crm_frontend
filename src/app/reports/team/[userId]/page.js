"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError, EmptyState } from "@/components/error-boundary";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatCardSkeleton, Skeleton } from "@/components/loading/loadingSkeletons";
import { GroupedVerticalBars, HorizontalBars } from "@/components/ui/chart";
import { PageToolbar } from "@/components/page-toolbar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import {
  PERFORMANCE_WINDOWS,
  formatDays,
  formatHours,
  formatMoney,
  formatPercent,
  countLabel,
  joinParts,
  rateSub,
} from "@/lib/performance";

function TimingList({ rows, emptyTitle, emptyDescription }) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <div key={row.status} className="flex items-baseline justify-between gap-3 py-2">
          <div className="text-sm">{row.status}</div>
          <div className="text-right">
            <div className="text-sm font-medium tabular-nums">{formatDays(row.medianDays)}</div>
            <div className="text-xs text-muted">{countLabel(row.sample, "record")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserPerformancePage() {
  const params = useParams();
  const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;
  const [windowDays, setWindowDays] = useState(90);
  const [windowReady, setWindowReady] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextWindow = windowDays) {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api(`/reports/team/${userId}?window=${nextWindow}`);
      setData(res);
    } catch (err) {
      setData(null);
      setError(err?.message || "Failed to load performance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("window"));
    if (requested === 30 || requested === 90 || requested === 365) {
      setWindowDays(requested);
    }
    setWindowReady(true);
  }, []);

  function changeWindow(next) {
    setWindowDays(next);
    const params = new URLSearchParams(window.location.search);
    params.set("window", String(next));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (!windowReady) return;
    load(windowDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays, userId, windowReady]);

  const user = data?.user;
  const medians = data?.medians || {};
  const comparisonLabels = ["Won", "Lost", "Converted"];
  const hasComparison =
    (user?.winRate?.won || 0) +
      (user?.winRate?.lost || 0) +
      (user?.leadToJob?.converted || 0) +
      (user?.winRate?.priorWon || 0) +
      (user?.winRate?.priorLost || 0) +
      (user?.leadToJob?.priorConverted || 0) >
    0;

  return (
    <AppShell
      title={user?.name || "Performance"}
      description={loading ? "Loading…" : `Last ${windowDays} days`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/reports/team" className="btn px-3 py-2 text-xs">
            Team
          </Link>
          <Link href="/reports" className="btn px-3 py-2 text-xs">
            Reports
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Segmented
          aria-label="Performance window"
          value={windowDays}
          onChange={changeWindow}
          options={PERFORMANCE_WINDOWS}
        />

        {data?.attribution ? (
          <p className="text-sm text-muted">{data.attribution}</p>
        ) : null}

        {error ? <PageError message={error} onRetry={() => load(windowDays)} /> : null}

        <PageToolbar
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={() => load(windowDays)}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : user ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              size="metric"
              label="Win rate"
              value={formatPercent(user.winRate?.rate)}
              sub={rateSub(user.winRate, { noun: "decisions", median: medians.winRate })}
            />
            <StatCard
              size="metric"
              label="Overdue"
              value={formatPercent(user.overdue?.rate)}
              sub={
                user.overdue?.withDueDate
                  ? joinParts([
                      `${user.overdue.overdue} of ${user.overdue.withDueDate} with a due date`,
                      user.overdue.noDueDate
                        ? `${user.overdue.noDueDate} with no due date`
                        : null,
                      medians.overdueRate != null
                        ? `Team median ${formatPercent(medians.overdueRate)}`
                        : null,
                    ])
                  : "No tasks with a due date"
              }
            />
            <StatCard
              size="metric"
              label="Days to proposal"
              value={formatDays(user.medianDaysToProposal?.days)}
              sub={joinParts([
                countLabel(user.medianDaysToProposal?.sample, "job"),
                medians.medianDaysToProposal != null
                  ? `Team median ${formatDays(medians.medianDaysToProposal)}`
                  : null,
                user.medianDaysToProposal?.priorDays != null
                  ? `Previous ${formatDays(user.medianDaysToProposal.priorDays)}`
                  : null,
              ])}
            />
            <StatCard
              size="metric"
              label="Won revenue"
              value={formatMoney(user.wonRevenue?.amount)}
              sub={joinParts([
                medians.wonRevenue != null
                  ? `Team median ${formatMoney(medians.wonRevenue)}`
                  : null,
                `Previous ${formatMoney(user.wonRevenue?.priorAmount)}`,
              ])}
            />
            <StatCard
              size="metric"
              label="Lead to job"
              value={formatPercent(user.leadToJob?.rate)}
              sub={rateSub(user.leadToJob, { noun: "leads" })}
            />
            <StatCard
              size="metric"
              label="Collected"
              value={formatMoney(user.collectedRevenue?.amount)}
              sub={`Previous ${formatMoney(user.collectedRevenue?.priorAmount)}`}
            />
          </div>
        ) : null}

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : user ? (
          <SectionCard
            title="This window against the previous one"
            description="Counts, so a small sample stays visible when the rate is hidden."
          >
            {hasComparison ? (
              <GroupedVerticalBars
                labels={comparisonLabels}
                formatLabel={(label) => label}
                series={[
                  {
                    key: "current",
                    label: "This window",
                    values: [
                      user.winRate?.won || 0,
                      user.winRate?.lost || 0,
                      user.leadToJob?.converted || 0,
                    ],
                    series: 1,
                  },
                  {
                    key: "prior",
                    label: "Previous",
                    values: [
                      user.winRate?.priorWon || 0,
                      user.winRate?.priorLost || 0,
                      user.leadToJob?.priorConverted || 0,
                    ],
                    series: 2,
                  },
                ]}
              />
            ) : (
              <EmptyState title="No decisions in either window" />
            )}
          </SectionCard>
        ) : null}

        {user ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard title="Job stages" description="Jobs they hold now, by status.">
              <HorizontalBars
                rows={user.stageDropOff || []}
                emptyTitle="No jobs assigned"
              />
            </SectionCard>
            <SectionCard
              title="Time before leaving a stage"
              description="Median days from job history. Same-day reversals are left out."
            >
              <TimingList
                rows={user.stageTiming}
                emptyTitle="No stage changes in this window"
              />
            </SectionCard>
            <SectionCard
              title="Open time in stage"
              description="How long current open jobs have sat in their status."
            >
              <TimingList
                rows={user.openStageTiming}
                emptyTitle="No open jobs"
              />
            </SectionCard>
          </div>
        ) : null}

        {user ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Lead stage timing"
              description="Starts with status changes recorded after assignment history began."
            >
              <TimingList
                rows={user.leadStageTiming}
                emptyTitle="No lead status changes in this window"
              />
            </SectionCard>
            <SectionCard title="Proposal to decision" description="First Proposal Sent to Closed Won or Closed Lost.">
              <div className="text-2xl font-semibold tabular-nums">
                {formatDays(user.medianProposalToDecision?.days)}
              </div>
              <div className="mt-1 text-xs text-muted">
                {countLabel(user.medianProposalToDecision?.sample, "decision")}
                {user.medianProposalToDecision?.priorSample
                  ? ` · Previous ${formatDays(user.medianProposalToDecision.priorDays)}`
                  : ""}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {user ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard title="Open book" description="Records they hold right now.">
              <div className="divide-y divide-[var(--border)]">
                {[
                  ["Open leads", user.book?.leadsOpen || 0],
                  ["Open jobs", user.book?.jobsOpen || 0],
                  ["Open tasks", user.book?.tasksOpen || 0],
                  ["Overdue tasks", user.book?.tasksOverdue || 0],
                  ["Stale leads", user.stale?.leads || 0],
                  ["Stale jobs", user.stale?.jobs || 0],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                    <div className="text-sm">{label}</div>
                    <div className="text-sm font-medium tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Responsiveness">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted">First outbound response</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatHours(user.firstResponse?.medianHours)}
                  </div>
                  <div className="text-xs text-muted">
                    {countLabel(user.firstResponse?.sample, "lead")} with a response
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Proposal lag</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatDays(user.proposalLag?.medianDays)}
                  </div>
                  <div className="text-xs text-muted">
                    {countLabel(user.proposalLag?.sample, "job")} to a non-draft estimate
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Invoice aging on open jobs</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMoney(user.invoiceAging?.amount)}
                  </div>
                  <div className="text-xs text-muted">
                    {user.invoiceAging?.count || 0} past due
                  </div>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Quality">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted">Estimate decisions</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatPercent(user.estimateDecision?.rate)}
                  </div>
                  <div className="text-xs text-muted">
                    {rateSub(user.estimateDecision, { noun: "responses" })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Status reversals</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatPercent(user.reversals?.rate)}
                  </div>
                  <div className="text-xs text-muted">
                    {user.reversals?.reversals || 0} of {user.reversals?.sample || 0} moves
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Close quality</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatPercent(user.closeQuality?.rate)}
                  </div>
                  <div className="text-xs text-muted">
                    {user.closeQuality?.poor || 0} of {user.closeQuality?.sample || 0} won
                    jobs missing an invoice or unpaid past due
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Exits</div>
                  <div className="mt-1 text-sm">
                    {user.exits?.inactiveLeads || 0} inactive leads ·{" "}
                    {user.exits?.closedLostJobs || 0} closed lost
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
