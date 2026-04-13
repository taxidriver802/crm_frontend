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

function taskColorClass(task) {
  if (String(task?.status || "").toLowerCase() === "completed") {
    return "bg-green-500/15 text-green-700 dark:text-green-300";
  }
  if (task?.due_date && new Date(task.due_date).getTime() < Date.now()) {
    return "bg-red-500/15 text-red-700 dark:text-red-300";
  }
  return "bg-accent text-main";
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
  const columnCount = isMonth ? 7 : 7;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            onClick={() => shiftRange(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            onClick={() => setAnchorDate(startOfDay(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            onClick={() => shiftRange(1)}
          >
            Next
          </button>
          <div className="ml-1 text-sm font-medium">{title}</div>
        </div>

        <div className="border-base bg-surface flex items-center gap-1 rounded-md border p-1">
          <button
            type="button"
            className={`btn px-2 py-1 text-xs ${viewMode === "month" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setViewMode("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`btn px-2 py-1 text-xs ${viewMode === "week" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
        </div>
      </div>

      <div
        className="bg-surface grid gap-2 rounded-lg"
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

          return (
            <div
              key={key}
              className={`rounded-md border p-2 ${isCurrentMonth ? "" : "opacity-60"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold">{day.getDate()}</div>
                <button
                  type="button"
                  className="text-muted text-[11px] underline"
                  onClick={() => onDayCreate?.(day)}
                >
                  + task
                </button>
              </div>

              <div className="space-y-1">
                {dayTasks.length === 0 ? (
                  <div className="text-muted text-[11px]">No tasks</div>
                ) : (
                  dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] ${taskColorClass(task)}`}
                      onClick={() => onTaskClick?.(task)}
                      title={task.title}
                    >
                      {task.title}
                    </button>
                  ))
                )}
                {dayTasks.length > 3 ? (
                  <div className="text-muted text-[11px]">
                    +{dayTasks.length - 3} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
