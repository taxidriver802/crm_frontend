"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError, EmptyState } from "@/components/error-boundary";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/loading/loadingSkeletons";
import { DataTable, Td } from "@/components/ui/data-table";
import { PageToolbar } from "@/components/page-toolbar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";
import {
  PERFORMANCE_WINDOWS,
  formatDays,
  formatMoney,
  formatPercent,
  countLabel,
} from "@/lib/performance";

export default function TeamPerformancePage() {
  const [windowDays, setWindowDays] = useState(90);
  const [windowReady, setWindowReady] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextWindow = windowDays) {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/reports/team?window=${nextWindow}`);
      setData(res);
    } catch (err) {
      setData(null);
      setError(err?.message || "Failed to load team performance");
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

  useEffect(() => {
    if (!windowReady) return;
    load(windowDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays, windowReady]);

  function changeWindow(next) {
    setWindowDays(next);
    const params = new URLSearchParams(window.location.search);
    params.set("window", String(next));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  const medians = data?.medians || {};
  const users = data?.users || [];

  return (
    <AppShell
      title="Team performance"
      description={loading ? "Loading…" : "Individual results for the selected window"}
      right={
        <Link href="/reports" className="btn px-3 py-2 text-xs">
          Reports
        </Link>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              size="metric"
              label="Median win rate"
              value={formatPercent(medians.winRate)}
              sub="People with 10 or more decisions"
            />
            <StatCard
              size="metric"
              label="Median overdue"
              value={formatPercent(medians.overdueRate)}
              sub="Open tasks that have a due date"
            />
            <StatCard
              size="metric"
              label="Median days to proposal"
              value={formatDays(medians.medianDaysToProposal)}
              sub="New to Proposal Sent, 10 or more jobs"
            />
            <StatCard
              size="metric"
              label="Median won revenue"
              value={medians.wonRevenue == null ? "—" : formatMoney(medians.wonRevenue)}
              sub="Approved estimates on jobs won in the window"
            />
          </div>
        )}

        {loading ? null : users.length === 0 ? (
          <EmptyState title="No active team members" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Person</th>
                <th>Win rate</th>
                <th>Overdue</th>
                <th>Days to proposal</th>
                <th>Won</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.userId}>
                  <Td primary label="Person">
                    <Link
                      href={`/reports/team/${row.userId}?window=${windowDays}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                  </Td>
                  <Td label="Win rate">
                    <div className="tabular-nums">{formatPercent(row.winRate?.rate)}</div>
                    <div className="text-xs text-muted">
                      {row.winRate?.won || 0} won · {row.winRate?.lost || 0} lost
                    </div>
                  </Td>
                  <Td label="Overdue">
                    <div
                      className={cx(
                        "tabular-nums",
                        row.overdue?.overdue > 0 && "font-medium text-danger",
                      )}
                    >
                      {formatPercent(row.overdue?.rate)}
                    </div>
                    <div className="text-xs text-muted">
                      {row.overdue?.overdue || 0} of {row.overdue?.withDueDate || 0}
                      {row.overdue?.noDueDate
                        ? ` · ${row.overdue.noDueDate} no due date`
                        : ""}
                    </div>
                  </Td>
                  <Td label="Days to proposal">
                    <div className="tabular-nums">
                      {formatDays(row.medianDaysToProposal?.days)}
                    </div>
                    <div className="text-xs text-muted">
                      {countLabel(row.medianDaysToProposal?.sample, "job")}
                    </div>
                  </Td>
                  <Td label="Won">
                    <div className="tabular-nums">{formatMoney(row.wonRevenue?.amount)}</div>
                    <div className="text-xs text-muted">
                      Previous {formatMoney(row.wonRevenue?.priorAmount)}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </AppShell>
  );
}
