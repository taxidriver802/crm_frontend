"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  formatDayKey,
  formatMonthLabel,
  formatShortDay,
  startOfDay,
  startOfMonth,
  startOfWeekMonday,
} from "@/components/calendar/calendar-shared";
import { Segmented } from "@/components/ui/segmented";
import { cx } from "@/lib/cx";

function taskEventClass(task) {
  if (String(task?.status || "").toLowerCase() === "completed") {
    return "cal-event cal-event-done";
  }
  if (task?.due_date && new Date(task.due_date).getTime() < Date.now()) {
    return "cal-event cal-event-overdue";
  }
  return "cal-event cal-event-upcoming";
}

export function TaskCalendar({ tasks, onTaskClick, onRangeChange, onDayCreate }) {
  const [viewMode, setViewMode] = useState("month");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));

  const gridDays = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeekMonday(anchorDate);
      return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }

    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const gridStart = startOfWeekMonday(monthStart);
    const gridEnd = addDays(startOfWeekMonday(monthEnd), 6);
    const days = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [viewMode, anchorDate]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      if (!task?.due_date) continue;
      const key = formatDayKey(new Date(task.due_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    return map;
  }, [tasks]);

  useEffect(() => {
    let from;
    let to;
    if (viewMode === "week") {
      const start = startOfWeekMonday(anchorDate);
      from = startOfDay(start).toISOString();
      to = endOfDay(addDays(start, 6)).toISOString();
    } else {
      from = startOfDay(startOfMonth(anchorDate)).toISOString();
      to = endOfDay(endOfMonth(anchorDate)).toISOString();
    }
    onRangeChange?.({ dateFrom: from, dateTo: to });
  }, [viewMode, anchorDate, onRangeChange]);

  function shiftRange(direction) {
    setAnchorDate((prev) =>
      viewMode === "week"
        ? addDays(prev, direction * 7)
        : new Date(prev.getFullYear(), prev.getMonth() + direction, 1),
    );
  }

  const isMonth = viewMode === "month";
  const columnCount = 7;
  const title = isMonth
    ? formatMonthLabel(anchorDate)
    : `${startOfWeekMonday(anchorDate).toLocaleDateString()} - ${addDays(
        startOfWeekMonday(anchorDate),
        6,
      ).toLocaleDateString()}`;

  const weekHeaderStart = startOfWeekMonday(new Date());
  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekHeaderStart, i),
  );
  const todayKey = formatDayKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => shiftRange(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setAnchorDate(startOfDay(new Date()))}
          >
            Today
          </button>
          <button type="button" className="btn btn-sm" onClick={() => shiftRange(1)}>
            Next
          </button>
          <div className="ml-1 text-sm font-medium">{title}</div>
        </div>

        <Segmented
          aria-label="Calendar view"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
        />
      </div>

      <div
        className="bg-surface grid gap-2 rounded-theme-lg p-2"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {weekHeaderDays.map((day) => (
          <div
            key={`h-${formatDayKey(day)}`}
            className="text-muted px-2 py-1 text-xs font-semibold"
          >
            {formatShortDay(day)}
          </div>
        ))}

        {gridDays.map((day) => {
          const key = formatDayKey(day);
          const dayTasks = tasksByDay.get(key) || [];
          const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={cx(
                "cal-day",
                isMonth && !isCurrentMonth && "cal-day-outside",
                isToday && "cal-day-today",
              )}
            >
              <div className="border-base flex items-center justify-between border-b p-2">
                <div className={cx("cal-day-num text-xs font-semibold", isToday && "text-accent")}>
                  {day.getDate()}
                </div>
                <button
                  type="button"
                  className="text-muted text-[11px] underline"
                  onClick={() => onDayCreate?.(day)}
                >
                  + task
                </button>
              </div>

              <div className="space-y-1 p-2 pb-2">
                {dayTasks.length === 0 ? (
                  <div className="text-muted text-[11px]">No tasks</div>
                ) : (
                  dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={taskEventClass(task)}
                      onClick={() => onTaskClick?.(task)}
                      title={task.title}
                    >
                      {task.title}
                    </button>
                  ))
                )}
                {dayTasks.length > 3 ? (
                  <div className="text-muted text-[11px]">+{dayTasks.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
