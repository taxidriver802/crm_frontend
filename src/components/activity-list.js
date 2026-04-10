import { useMemo, useState } from "react";
import { formatActivity, formatActivityTimestamp, getActivityHref } from "@/lib/activity";
import Link from "next/link";

function getActivityDateLabel(value) {
  if (!value) return "Older";

  const date = new Date(value);
  const now = new Date();

  const activityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = today.getTime() - activityDay.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Last 7 Days";
  if (diffDays < 30) return "Last 30 Days";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: today.getFullYear() !== activityDay.getFullYear() ? "numeric" : undefined,
  });
}

function groupActivityByDate(items) {
  return items.reduce((groups, item) => {
    const label = getActivityDateLabel(item.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
    return groups;
  }, {});
}

function getDefaultVisibleActivityCount(label) {
  if (label === "Today") return 4;
  if (label === "Yesterday") return 3;
  if (label === "Last 7 Days") return 3;
  if (label === "Last 30 Days") return 2;
  return 2;
}

export function ActivityList({
  activity = [],
  loading = false,
  emptyText = "No activity yet",
  grouped = true,
  maxPerGroup,
  className = "",
}) {
  const [expandedGroups, setExpandedGroups] = useState({});

  const groupedActivity = useMemo(() => {
    if (!grouped) return null;
    return groupActivityByDate(activity);
  }, [activity, grouped]);

  function toggleGroup(label) {
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading activity...</div>;
  }

  if (!activity || activity.length === 0) {
    return <div className="text-muted text-sm">{emptyText}</div>;
  }

  if (!grouped) {
    return (
      <div className={`space-y-3 ${className}`}>
        {activity.map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedActivity).map(([label, items]) => {
        const defaultVisible = maxPerGroup ?? getDefaultVisibleActivityCount(label);
        const isExpanded = !!expandedGroups[label];
        const visibleItems = isExpanded ? items : items.slice(0, defaultVisible);
        const hiddenCount = Math.max(0, items.length - visibleItems.length);

        return (
          <div key={label} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted text-xs font-semibold uppercase tracking-wide">
                {label}
              </div>

              {items.length > defaultVisible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(label)}
                  className="btn px-3 py-1.5 text-xs"
                >
                  {isExpanded
                    ? "Show fewer"
                    : `Show more${hiddenCount > 0 ? ` (${hiddenCount})` : ""}`}
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {visibleItems.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityItem({ item }) {
  const href = getActivityHref(item);
  const formatted = formatActivity(item);

  const content = (
    <div className="border-base hover:bg-accent rounded-lg border p-3 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm">{formatted.icon}</span>
            <div className="text-sm font-medium">{formatted.title}</div>
          </div>

          {formatted.detail ? (
            <div className="text-muted line-clamp-2 text-sm leading-5">
              {formatted.detail}
            </div>
          ) : null}

          {formatted.meta ? (
            <div className="text-muted line-clamp-1 text-xs leading-5">
              {formatted.meta}
            </div>
          ) : null}
        </div>

        <div className="text-muted shrink-0 whitespace-nowrap pt-0.5 text-xs">
          {formatActivityTimestamp(item)}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
