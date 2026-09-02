"use client";

import { useEffect, useState, useRef } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  DAY_PICKER_CLASSNAMES,
  parseLocalDate,
} from "@/components/calendar/calendar-shared";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";

const STATUS_OPTIONS = ["Pending", "Completed"];

const EMPTY_TASK_FORM = {
  lead_id: "",
  job_id: "",
  title: "",
  description: "",
  due_date: "",
  status: "Pending",
};

export function createEmptyTaskForm(overrides = {}) {
  return {
    ...EMPTY_TASK_FORM,
    ...overrides,
  };
}

function getLeadOptionLabel(lead) {
  const name =
    `${(lead.first_name || "").trim()} ${(lead.last_name || "").trim()}`.trim() ||
    `Lead #${lead.id}`;

  return lead.status ? `${name} (#${lead.id}) • ${lead.status}` : `${name} (#${lead.id})`;
}

function getJobOptionLabel(job) {
  return job.title || `Job #${job.id}`;
}

export function TaskForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create task",
  cancelLabel,
  onCancel,
  contextType,
  onContextChange,
  leads = [],
  jobs = [],
  loadingLeads = false,
  loadingJobs = false,
  isContextLocked = false,
  layout = "default", // default | compact
}) {
  const isCompact = layout === "compact";

  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      {!isContextLocked ? (
        <Segmented
          aria-label="Task context"
          value={contextType}
          onChange={(next) => onContextChange?.(next)}
          options={[
            { value: "lead", label: "Lead" },
            { value: "job", label: "Job" },
          ]}
        />
      ) : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <div className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          {contextType === "lead" ? (
            <Field
              label="Lead"
              required
              help={
                leads.length
                  ? "Pick the lead this task belongs to."
                  : "Create a lead first, then come back to create tasks."
              }
            >
              <select
                className="input"
                value={form.lead_id}
                onChange={(e) => setField("lead_id", e.target.value)}
                disabled={loadingLeads || saving || isContextLocked}
              >
                <option value="">
                  {loadingLeads
                    ? "Loading leads…"
                    : leads.length
                      ? "Select a lead…"
                      : "No leads found"}
                </option>

                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {getLeadOptionLabel(lead)}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field
              label="Job"
              required
              help={
                jobs.length
                  ? "Select the job this task belongs to."
                  : "Create a job first, then come back to create tasks."
              }
            >
              <select
                className="input"
                value={form.job_id}
                onChange={(e) => setField("job_id", e.target.value)}
                disabled={loadingJobs || saving || isContextLocked}
              >
                <option value="">
                  {loadingJobs
                    ? "Loading jobs…"
                    : jobs.length
                      ? "Select a job…"
                      : "No jobs found"}
                </option>

                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {getJobOptionLabel(job)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Due date">
          <CustomDateTimePicker
            value={form.due_date}
            onChange={(val) => setField("due_date", val)}
          />
        </Field>

        <Field
          label="Title"
          required
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <input
            className="input"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. Call about showing"
            required
          />
        </Field>

        <Field
          label="Description"
          className={isCompact ? "md:col-span-2" : "sm:col-span-2"}
        >
          <textarea
            className="input min-h-[120px]"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Extra context, talking points, etc."
          />
        </Field>
      </div>

      <FormActions>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>

        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            {cancelLabel || "Cancel"}
          </button>
        ) : null}
      </FormActions>
    </form>
  );
}

function to12HourParts(time24) {
  if (!time24) {
    return { hour: "12", minute: "00", period: "AM" };
  }

  const [rawHour = "00", rawMinute = "00"] = time24.split(":");
  const hourNum = Number(rawHour);
  const minute = rawMinute.padStart(2, "0");

  const period = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;

  return {
    hour: String(hour12),
    minute,
    period,
  };
}

function to24HourString(hour12, minute, period) {
  let hourNum = Number(hour12);

  if (Number.isNaN(hourNum) || hourNum < 1 || hourNum > 12) {
    hourNum = 12;
  }

  let convertedHour = hourNum % 12;

  if (period === "PM") {
    convertedHour += 12;
  }

  return `${String(convertedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplayTime(time24) {
  if (!time24) return "Select time";

  const { hour, minute, period } = to12HourParts(time24);
  return `${hour}:${minute} ${period}`;
}

function CustomTimePicker({ value, onChange, isOpen, onToggle, onClose }) {
  const { hour, minute, period } = to12HourParts(value);

  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const PERIODS = ["AM", "PM"];

  function updateTime(next) {
    const nextHour = next.hour ?? hour;
    const nextMinute = next.minute ?? minute;
    const nextPeriod = next.period ?? period;

    onChange(to24HourString(nextHour, nextMinute, nextPeriod));
  }

  return (
    <div className="relative w-full">
      <button type="button" onClick={onToggle} className="input w-full text-left">
        {formatDisplayTime(value)}
      </button>

      {isOpen && (
        <div className="dropdown-panel absolute right-0 z-50 mt-2 w-full min-w-[220px] p-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label mb-1">Hour</label>
              <select
                className="input"
                value={hour}
                onChange={(e) => updateTime({ hour: e.target.value })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-1">Minute</label>
              <select
                className="input"
                value={minute}
                onChange={(e) => updateTime({ minute: e.target.value })}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-1">AM / PM</label>
              <select
                className="input"
                value={period}
                onChange={(e) => updateTime({ period: e.target.value })}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onChange("");
                onClose();
              }}
            >
              Clear
            </button>

            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomDateTimePicker({ value, onChange }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [openPanel, setOpenPanel] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!value) return;

    const [d, t] = value.split("T");

    if (d) {
      setDate(parseLocalDate(d));
    }

    setTime(t?.slice(0, 5) || "");
  }, [value]);

  function updateDateTime(d, t) {
    if (!d) return onChange("");

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const combined = t ? `${yyyy}-${mm}-${dd}T${t}` : `${yyyy}-${mm}-${dd}T00:00`;

    onChange(combined);
  }

  function handleDateSelect(selectedDate) {
    setDate(selectedDate);
    setOpenPanel(null);
    updateDateTime(selectedDate, time);
  }

  function handleTimeChange(newTime) {
    setTime(newTime);
    if (!date) return; // 👈 prevent invalid update
    updateDateTime(date, newTime);
  }

  function formatDisplayDate(d) {
    if (!d) return "Select date";

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setOpenPanel(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={pickerRef} className="flex gap-2">
      {/* Date Button */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpenPanel((prev) => (prev === "date" ? null : "date"))}
          className="input w-full text-left"
        >
          {formatDisplayDate(date)}
        </button>

        {openPanel === "date" && (
          <div className="dropdown-panel absolute z-50 mt-2 p-2">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              captionLayout="dropdown"
              navLayout="after"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
              showOutsideDays
              className="text-main text-sm"
              classNames={DAY_PICKER_CLASSNAMES}
            />
          </div>
        )}
      </div>

      {/* Time */}
      <CustomTimePicker
        value={time}
        onChange={handleTimeChange}
        isOpen={openPanel === "time"}
        onToggle={() => setOpenPanel((prev) => (prev === "time" ? null : "time"))}
        onClose={() => setOpenPanel(null)}
      />
    </div>
  );
}
