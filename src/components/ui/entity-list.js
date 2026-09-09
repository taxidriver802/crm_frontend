"use client";

import { Children } from "react";
import { EmptyState } from "@/components/error-boundary";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { cx } from "@/lib/cx";

/**
 * Full-width entity rows for index pages.
 *
 * Prefer this over DataTable for navigable entity lists. Multi-column tables
 * need ~900px before truncating, but the desktop sidebar claims ~256px at `lg`,
 * so the content area is most cramped on laptops — and overflow-x-auto turns
 * that into horizontal scrolling. Rows use flex-wrap meta so narrow containers
 * reflow instead of scrolling sideways.
 */

export function EntityListMeta({ label, children, className = "" }) {
  return (
    <div className={cx("flex min-w-0 items-baseline gap-1.5", className)}>
      <span className="text-muted shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.06em]">
        {label}
      </span>
      <div className="min-w-0 truncate text-xs">{children}</div>
    </div>
  );
}

export function EntityListPrimary({ title, subtitle = null, badges = null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
      <div className="min-w-[14rem] flex-1 basis-0">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle ? (
          <div className="text-muted mt-0.5 truncate text-xs">{subtitle}</div>
        ) : null}
      </div>
      {badges ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
          {badges}
        </div>
      ) : null}
    </div>
  );
}

export function EntityListMetaStrip({ children, className = "" }) {
  return (
    <div
      className={cx(
        "mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EntityListAssignee({
  label = "Assignee",
  canEdit,
  value,
  teamUsers = [],
  displayName,
  ariaLabel,
  onAssign,
  className = "",
}) {
  return (
    <div
      className={cx(
        "flex min-w-0 items-baseline gap-1.5 sm:ml-auto",
        className,
      )}
    >
      <span className="text-muted shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.06em]">
        {label}
      </span>
      {canEdit ? (
        <select
          className="input w-auto max-w-[11rem] truncate px-2 py-1 text-xs"
          value={value || ""}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onAssign(e.target.value);
          }}
          aria-label={ariaLabel}
        >
          <option value="">Unassigned</option>
          {teamUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </option>
          ))}
        </select>
      ) : (
        <span className="min-w-0 truncate text-xs">{displayName || "—"}</span>
      )}
    </div>
  );
}

export function EntityListRow({
  ariaLabel,
  onOpen,
  variant = "card",
  className = "",
  children,
}) {
  function handleKeyDown(e) {
    if (!onOpen) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  const flush = variant === "flush";

  return (
    <div
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onOpen || undefined}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={cx(
        flush
          ? "border-base border-t px-4 py-3.5 first:border-t-0"
          : "list-row",
        onOpen &&
          (flush
            ? "hover:bg-accent-soft focus-visible:bg-accent-soft cursor-pointer focus:outline-none"
            : "hover:bg-accent focus-visible:border-strong cursor-pointer focus:outline-none"),
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EntityListSkeleton({ rows = 3, layout = "stack" }) {
  const flush = layout === "flush";
  const rowClass = flush
    ? "border-base space-y-2 border-t px-4 py-3.5 first:border-t-0"
    : "list-row space-y-3";

  const rowsEl = (
    <div className={flush ? "card overflow-hidden p-0" : "space-y-2"}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={rowClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  return rowsEl;
}

export function EntityList({
  loading,
  emptyTitle,
  emptyDescription,
  skeletonRows = 3,
  layout = "stack",
  children,
}) {
  if (loading) return <EntityListSkeleton rows={skeletonRows} layout={layout} />;
  if (Children.count(children) === 0) {
    const empty = <EmptyState title={emptyTitle} description={emptyDescription} />;
    return layout === "flush" ? <div className="card p-4">{empty}</div> : empty;
  }

  if (layout === "flush") {
    return <div className="card overflow-hidden p-0">{children}</div>;
  }

  return <div className="space-y-2">{children}</div>;
}

export function formatAssigneeName(user) {
  if (!user) return "";
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return name || user.email || "";
}
