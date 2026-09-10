"use client";

import { useState } from "react";
import { ReturnLink } from "@/components/return-to";
import { ListRow } from "@/components/ui/list-row";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/error-boundary";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";

function formatActionWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActionQueue({
  title,
  items = [],
  loading = false,
  href,
  emptyTitle = "Nothing here",
  hideWhenEmpty = true,
  rightAction = null,
  collapsible = false,
  defaultOpen = true,
}) {
  const list = Array.isArray(items) ? items : [];
  const empty = !loading && list.length === 0;
  const automaticOpen = empty ? false : defaultOpen;
  // null = follow automaticOpen; boolean = user has toggled
  const [userOpen, setUserOpen] = useState(null);
  const open = !collapsible
    ? true
    : userOpen === null
      ? automaticOpen
      : userOpen;

  function toggleOpen() {
    setUserOpen((prev) => {
      const current = prev === null ? automaticOpen : prev;
      return !current;
    });
  }

  if (!loading && hideWhenEmpty && list.length === 0) {
    return null;
  }

  const hasRight = Boolean(rightAction || href || collapsible);

  return (
    <SectionCard
      title={title}
      collapsed={collapsible && !open}
      right={
        hasRight ? (
          <>
            {rightAction ? (
              <div
                className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2"
                onClickCapture={() => {
                  if (collapsible && !open) {
                    setUserOpen(true);
                  }
                }}
              >
                {rightAction}
              </div>
            ) : null}
            {href ? (
              <ReturnLink className="text-muted text-xs hover:underline" href={href}>
                View all
              </ReturnLink>
            ) : null}
            {collapsible ? (
              <button
                type="button"
                onClick={toggleOpen}
                className="btn shrink-0 px-3 py-2 text-xs"
                aria-expanded={open}
              >
                {open ? "Hide" : "Show"}
              </button>
            ) : null}
          </>
        ) : null
      }
    >
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : list.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="space-y-2">
          {list.map((item) => {
            const when = formatActionWhen(item.at);
            return (
              <ListRow
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-muted mt-1 flex flex-wrap items-center gap-x-1 text-sm">
                    {item.subtitle ? <span>{item.subtitle}</span> : null}
                    {item.subtitle && item.reason ? <span>·</span> : null}
                    {item.reason ? <span>{item.reason}</span> : null}
                    {(item.subtitle || item.reason) && when ? <span>·</span> : null}
                    {when ? <span>{when}</span> : null}
                  </div>
                </div>
              </ListRow>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
