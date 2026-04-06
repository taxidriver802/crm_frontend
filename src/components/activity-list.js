import { formatActivity, formatActivityTimestamp, getActivityHref } from "@/lib/activity";
import Link from "next/link";

export function ActivityList({ activity, loading, emptyText = "No activity yet" }) {
  if (loading) {
    return <div className="text-muted text-sm">Loading activity...</div>;
  }

  if (!activity || activity.length === 0) {
    return <div className="text-muted text-sm">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {activity.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
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
