"use client";

import Link from "next/link";
import { ReturnLink } from "@/components/return-to";
import { formatActivity, formatActivityTimestamp, getActivityHref } from "@/lib/activity";
import { EmptyState } from "@/components/error-boundary";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { cx } from "@/lib/cx";

function RailCard({ title, href, children }) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        {href ? (
          <ReturnLink href={href} className="text-muted text-xs hover:underline">
            View all
          </ReturnLink>
        ) : null}
      </div>
      <div className="border-base border-t">{children}</div>
    </section>
  );
}

function FilterRow({ id, label, value, tone, active, onFocus }) {
  const alert = tone === "danger" && Number(value) > 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onFocus?.(active ? "all" : id)}
      className={cx(
        "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left",
        active ? "bg-accent-soft" : "hover:bg-accent-soft",
      )}
    >
      <span className="text-muted text-sm">{label}</span>
      <span
        className={cx(
          "text-sm font-semibold tabular-nums",
          alert && "text-danger",
        )}
      >
        {value}
      </span>
    </button>
  );
}

function assigneeQuery(userId) {
  if (userId == null) return "unassigned";
  return String(userId);
}

export function ContextRail({
  filters = [],
  focus,
  onFocus,
  workload = [],
  activity = [],
  canViewTeam = false,
  loading = false,
  loadingActivity = false,
}) {
  return (
    <div className="space-y-4">
      {filters.length > 0 ? (
        <RailCard title="Focus">
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filters.map((row) => (
                <FilterRow
                  key={row.id}
                  {...row}
                  active={focus === row.id}
                  onFocus={onFocus}
                />
              ))}
            </div>
          )}
        </RailCard>
      ) : null}

      {canViewTeam ? (
        <RailCard title="Team" href="/users">
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : workload.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No team members yet" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {workload.map((row) => {
                const assigned = assigneeQuery(row.user_id);
                return (
                  <div
                    key={row.user_id || "unassigned"}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.name}</div>
                      <div className="text-muted text-xs">
                        {row.leads_open} leads · {row.jobs_open} jobs
                      </div>
                    </div>
                    <Link
                      href={`/tasks?assignedTo=${encodeURIComponent(assigned)}&duePreset=overdue`}
                      className={cx(
                        "text-sm tabular-nums hover:underline",
                        row.tasks_overdue > 0 && "text-danger font-medium",
                      )}
                    >
                      {row.tasks_overdue} overdue
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </RailCard>
      ) : null}

      <RailCard title="Activity">
        {loadingActivity ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : activity.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No recent activity" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {activity.slice(0, 6).map((item) => {
              const href = getActivityHref(item);
              const formatted = formatActivity(item);
              const body = (
                <div className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-muted text-xs">{formatted.title}</div>
                      {formatted.subject ? (
                        <div className="mt-0.5 truncate text-sm font-medium">
                          {formatted.subject}
                        </div>
                      ) : null}
                      {formatted.detail ? (
                        <div className="text-muted mt-0.5 line-clamp-1 text-xs">
                          {formatted.detail}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-muted shrink-0 text-xs">
                      {formatActivityTimestamp(item)}
                    </div>
                  </div>
                </div>
              );

              return href ? (
                <ReturnLink key={item.id} href={href} className="hover:bg-accent-soft block">
                  {body}
                </ReturnLink>
              ) : (
                <div key={item.id}>{body}</div>
              );
            })}
          </div>
        )}
      </RailCard>
    </div>
  );
}
