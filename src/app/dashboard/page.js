"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageError } from "@/components/error-boundary";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { greetingFor, mergeActions, todayLabel } from "@/components/dashboard/queue";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { resolveWidgets } from "@/lib/preferences";
import { formatMoney } from "@/lib/job-lifecycle";
import {
  ActivityWidget,
  AgendaWidget,
  HandoffsWidget,
  MoneyWidget,
  NeedsYouWidget,
  PinnedWidget,
  PipelineWidget,
  TeamWidget,
} from "@/components/today/widgets";
import { CustomizeHome } from "@/components/today/customize-home";

const EMPTY = [];

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Today: a personal workbench, not a wall of counts. It answers three
 * questions in order — what needs me, what is on my calendar, and what is
 * stuck between hands — and lets each person arrange the rest.
 */
export default function TodayPage() {
  const { user, isAdmin, prefs, role } = useWorkspace();
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewScope, setViewScope] = useState("mine");
  const [customizing, setCustomizing] = useState(false);

  const scopeQuery = isAdmin && viewScope === "all" ? "?view=all" : "";

  const load = useCallback(async () => {
    setError("");
    try {
      const [dash, act] = await Promise.all([
        api(`/dashboard${scopeQuery}`),
        api("/dashboard/activities").catch(() => ({ activity: [] })),
      ]);
      setData(dash);
      setActivity(act?.activity || []);
    } catch (e) {
      setError(e?.message || "Could not load Today");
    } finally {
      setLoading(false);
    }
  }, [scopeQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    api("/dashboard/workload")
      .then((res) => alive && setWorkload(res?.workload || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const actions = useMemo(() => data?.actions || {}, [data]);
  const needsYou = useMemo(
    () =>
      mergeActions(
        actions.overdueFollowUps || EMPTY,
        actions.invoicesDue || EMPTY,
        actions.readyToBill || EMPTY,
        actions.blockedJobs || EMPTY,
        actions.soldNotScheduled || EMPTY,
        actions.estimatesAwaiting || EMPTY,
        actions.staleLeads || EMPTY,
        actions.dueToday || EMPTY,
      ),
    [actions],
  );

  const agendaTasks = useMemo(() => {
    const tasks = [...(data?.tasks?.dueTodayTasks || []), ...(data?.tasks?.nextUp || [])];
    const seen = new Set();
    return tasks
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return t.status !== "Completed";
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [data]);

  const widgets = resolveWidgets(prefs.home, role);
  const isClient = useIsClient();
  const title = isClient ? greetingFor(user?.first_name) : "Today";
  const lateCount = needsYou.filter((item) => /overdue/i.test(item.reason || "")).length;
  const summary = isClient
    ? [
        todayLabel(),
        loading ? null : lateCount ? `${lateCount} late` : "nothing late",
        !loading && data?.money?.outstanding_total ? `${formatMoney(data.money.outstanding_total)} owed` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  function renderWidget(widget) {
    switch (widget.id) {
      case "needs-you":
        return <NeedsYouWidget key={widget.id} items={needsYou} loading={loading} onTaskDone={load} />;
      case "agenda":
        return <AgendaWidget key={widget.id} tasks={agendaTasks} loading={loading} />;
      case "handoffs":
        return (
          <HandoffsWidget
            key={widget.id}
            loading={loading}
            sold={actions.soldNotScheduled || EMPTY}
            ready={actions.readyToBill || EMPTY}
            awaiting={actions.estimatesAwaiting || EMPTY}
          />
        );
      case "money":
        return <MoneyWidget key={widget.id} money={data?.money} loading={loading} />;
      case "pipeline":
        return <PipelineWidget key={widget.id} byStatus={data?.jobs?.byStatus || EMPTY} loading={loading} />;
      case "pinned":
        return <PinnedWidget key={widget.id} pins={prefs.nav?.pins || EMPTY} />;
      case "team":
        return <TeamWidget key={widget.id} rows={workload} loading={loading} />;
      case "activity":
        return <ActivityWidget key={widget.id} activity={activity} loading={loading} />;
      default:
        return null;
    }
  }

  const shown = widgets.filter((w) => !w.hidden);
  const main = shown.filter((w) => w.column === "main");
  const side = shown.filter((w) => w.column !== "main");

  return (
    <AppShell
      title={title}
      description={summary}
      right={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <Segmented
              aria-label="Whose work"
              value={viewScope}
              onChange={setViewScope}
              options={[
                { value: "mine", label: "Mine", short: "Mine" },
                { value: "all", label: "Team", short: "Team" },
              ]}
            />
          ) : null}
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={customizing}
            onClick={() => setCustomizing((v) => !v)}
          >
            <Icon name="layout" className="h-3.5 w-3.5" />
            Customize
          </button>
        </div>
      }
    >
      {error ? <PageError message={error} onRetry={load} /> : null}

      {customizing ? <CustomizeHome onDone={() => setCustomizing(false)} /> : null}

      {shown.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Everything is hidden. Use Customize to bring widgets back.
        </div>
      ) : (
        <div className="today-grid">
          <div className="today-col">{main.map(renderWidget)}</div>
          <div className="today-col">{side.map(renderWidget)}</div>
        </div>
      )}
    </AppShell>
  );
}
