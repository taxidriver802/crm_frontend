export const DAY_PICKER_CLASSNAMES = {
  root: "rdp-root",
  month: "space-y-3",
  caption: "px-0",
  caption_label: "hidden",
  dropdowns: "flex w-full justify-center gap-2",
  dropdown: "input h-9 w-auto px-2 py-1 text-sm",
  nav: "flex justify-center gap-2",
  button_previous: "icon-btn h-9 w-9",
  button_next: "icon-btn h-9 w-9",
  table: "w-full border-collapse",
  head_row: "grid grid-cols-7",
  row: "grid grid-cols-7",
  weekday: "text-muted py-1 text-center text-xs font-medium",
  day: "h-10 w-10 rounded-md p-0 text-sm",
  day_button:
    "h-10 w-10 rounded-md transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
  selected: "bg-accent rounded-md text-white hover:bg-accent",
  today: "text-muted opacity-25 font-normal",
  outside: "text-soft opacity-50",
  disabled: "text-soft opacity-40",
};

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date, count) {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfWeekMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function formatDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatShortDay(date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
