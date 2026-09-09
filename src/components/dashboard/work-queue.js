"use client";

import { ReturnLink } from "@/components/return-to";
import Link from "next/link";
import { EmptyState } from "@/components/error-boundary";
import { StatusBadge } from "@/components/ui/status-badge";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import {
  QUEUE_FILTERS,
  formatActionWhen,
  kindMeta,
  matchesQueueFilter,
} from "@/components/dashboard/queue";

function WorkRow({ item, completingId, onComplete }) {
  const meta = kindMeta(item);
  const when = formatActionWhen(item.at);
  const canComplete = item.kind === "task" && typeof onComplete === "function";
  const busy = completingId === item.id;

  return (
    <div className="border-base flex items-start gap-3 border-t px-4 py-3.5 first:border-t-0">
      <StatusBadge tone={meta.tone} className="mt-0.5 shrink-0">
        {meta.label}
      </StatusBadge>

      <div className="min-w-0 flex-1">
        <ReturnLink
          href={item.href}
          className="hover:text-main font-medium hover:underline"
        >
          {item.title}
        </ReturnLink>
        <div className="text-muted mt-1 flex flex-wrap items-center gap-x-1 text-sm">
          {item.subtitle ? <span>{item.subtitle}</span> : null}
          {item.subtitle && item.reason ? <span>·</span> : null}
          {item.reason ? <span>{item.reason}</span> : null}
          {(item.subtitle || item.reason) && when ? <span>·</span> : null}
          {when ? <span>{when}</span> : null}
        </div>
      </div>

      {canComplete ? (
        <button
          type="button"
          className="btn btn-sm shrink-0"
          disabled={busy}
          onClick={() => onComplete(item.id)}
        >
          {busy ? "Saving" : "Done"}
        </button>
      ) : (
        <ReturnLink
          href={item.href}
          className="text-muted hover:text-main shrink-0 pt-0.5 text-xs hover:underline"
        >
          Open
        </ReturnLink>
      )}
    </div>
  );
}

export function WorkQueue({
  items = [],
  laterItems = [],
  filter = "all",
  onFilterChange,
  loading = false,
  completingId = null,
  onComplete,
}) {
  const visible = items.filter((item) => matchesQueueFilter(item, filter));
  const showLater = filter === "all" && laterItems.length > 0;
  const counts = QUEUE_FILTERS.reduce((acc, option) => {
    acc[option.id] =
      option.id === "all"
        ? items.length
        : items.filter((item) => matchesQueueFilter(item, option.id)).length;
    return acc;
  }, {});

  return (
    <section className="card overflow-hidden p-0">
      <div className="border-base space-y-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Do next</div>
            <p className="text-muted mt-0.5 text-xs">
              One list, prioritized. Finish these before hunting through records.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/leads/new" className="btn btn-primary btn-sm">
              New lead
            </Link>
            <Link href="/tasks/new" className="btn btn-sm">
              New task
            </Link>
          </div>
        </div>
        <Segmented
          className="w-full"
          aria-label="Work queue filter"
          value={filter}
          onChange={onFilterChange}
          options={QUEUE_FILTERS.map((option) => ({
            value: option.id,
            label: option.label,
            short: option.short,
            count: counts[option.id],
            countTone:
              option.id === "overdue" && counts.overdue > 0 ? "danger" : undefined,
          }))}
        />
      </div>

      {loading ? (
        <div className="border-base border-t p-4">
          <SectionSkeleton rows={5} />
        </div>
      ) : visible.length === 0 ? (
        <div className="border-base border-t p-4">
          <EmptyState
            icon={<Icon name="inbox" className="h-5 w-5" />}
            title={filter === "all" ? "You're caught up" : "Nothing in this view"}
            description={
              filter === "all"
                ? "New follow-ups, estimates, and invoices will land here."
                : "Try All to see the rest of the queue."
            }
            action={
              filter === "all" ? null : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onFilterChange?.("all")}
                >
                  Show all
                </button>
              )
            }
          />
        </div>
      ) : (
        <div>
          {visible.map((item) => (
            <WorkRow
              key={`${item.kind}-${item.id}`}
              item={item}
              completingId={completingId}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}

      {showLater ? (
        <div className="border-base bg-surface border-t">
          <div className="text-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-wider">
            Later this week
          </div>
          {laterItems.map((item) => (
            <WorkRow
              key={`later-${item.kind}-${item.id}`}
              item={item}
              completingId={completingId}
              onComplete={onComplete}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
