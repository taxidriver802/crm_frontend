"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput, EmailInput, PhoneInput } from "@/components/ui/formatted-inputs";
import {
  BUDGET_RANGE_ERROR,
  NUMBER_ERROR,
  PHONE_ERROR,
  emailError,
  isValidNumber,
  isValidPhone,
} from "@/lib/input-format";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Closed", "Inactive"];
const SOURCE_OPTIONS = ["Referral", "Website", "Repeat customer", "Door knock", "Other"];
const SERVICE_OPTIONS = ["Inspection", "Repair", "Replacement", "Gutters", "Maintenance"];
const CONTACT_OPTIONS = ["Call", "Text", "Email"];
const URGENCY_OPTIONS = ["Low", "Normal", "Urgent"];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  source: "",
  status: "New",
  budget_min: "",
  budget_max: "",
  notes: "",
  service_type: "",
  preferred_contact_method: "",
  urgency: "",
};

function leadFieldErrors(form) {
  const errors = {};
  const emailMessage = emailError(form.email);
  if (emailMessage) errors.email = emailMessage;
  if (!isValidPhone(form.phone)) errors.phone = PHONE_ERROR;
  if (!isValidNumber(form.budget_min)) errors.budget_min = NUMBER_ERROR;
  if (!isValidNumber(form.budget_max)) errors.budget_max = NUMBER_ERROR;
  if (
    !errors.budget_min &&
    !errors.budget_max &&
    String(form.budget_min ?? "").trim() &&
    String(form.budget_max ?? "").trim() &&
    Number(form.budget_min) > Number(form.budget_max)
  ) {
    errors.budget_max = BUDGET_RANGE_ERROR;
  }
  return errors;
}

function withCurrentValue(options, value) {
  if (value && !options.includes(value)) {
    return [value, ...options];
  }
  return options;
}

export function createEmptyLeadForm(overrides = {}) {
  return { ...EMPTY_FORM, ...overrides };
}

export function LeadForm({
  form,
  onChange,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Create lead",
  cancelLabel,
  onCancel,
  layout = "default", // "default" | "compact"
}) {
  const isCompact = layout === "compact";
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key] && !((key === "budget_min" || key === "budget_max") && prev.budget_max)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      if (key === "budget_min" || key === "budget_max") delete next.budget_max;
      return next;
    });
  }

  function showFieldError(key) {
    const next = leadFieldErrors(form);
    setErrors((prev) => {
      const updated = { ...prev };
      if (next[key]) updated[key] = next[key];
      else delete updated[key];
      if (key === "budget_min" || key === "budget_max") {
        if (next.budget_max === BUDGET_RANGE_ERROR) updated.budget_max = BUDGET_RANGE_ERROR;
        else if (updated.budget_max === BUDGET_RANGE_ERROR) delete updated.budget_max;
      }
      return updated;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = leadFieldErrors(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(event);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      <div className={`grid gap-4 ${isCompact ? "md:grid-cols-2" : "sm:grid-cols-2"}`}>
        <Field label="First name" required>
          <input
            className="input"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
          />
        </Field>

        <Field label="Last name" required>
          <input
            className="input"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <EmailInput
            value={form.email}
            invalid={Boolean(errors.email)}
            onChange={(value) => setField("email", value)}
            onBlur={() => showFieldError("email")}
          />
        </Field>

        <Field label="Phone" error={errors.phone}>
          <PhoneInput
            value={form.phone}
            invalid={Boolean(errors.phone)}
            placeholder="(555) 123-4567"
            onChange={(value) => setField("phone", value)}
            onBlur={() => showFieldError("phone")}
          />
        </Field>

        <Field label="Source">
          <select
            className="input"
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(SOURCE_OPTIONS, form.source).map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </Field>

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

        <Field label="Service">
          <select
            className="input"
            value={form.service_type || ""}
            onChange={(e) => setField("service_type", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(SERVICE_OPTIONS, form.service_type).map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Preferred contact">
          <select
            className="input"
            value={form.preferred_contact_method || ""}
            onChange={(e) => setField("preferred_contact_method", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(CONTACT_OPTIONS, form.preferred_contact_method).map(
              (method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Urgency">
          <select
            className="input"
            value={form.urgency || ""}
            onChange={(e) => setField("urgency", e.target.value)}
          >
            <option value="">—</option>
            {withCurrentValue(URGENCY_OPTIONS, form.urgency).map((urgency) => (
              <option key={urgency} value={urgency}>
                {urgency}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Budget min" error={errors.budget_min}>
          <CurrencyInput
            value={form.budget_min}
            invalid={Boolean(errors.budget_min)}
            placeholder="$250,000"
            onChange={(value) => setField("budget_min", value)}
            onBlur={() => showFieldError("budget_min")}
          />
        </Field>

        <Field label="Budget max" error={errors.budget_max}>
          <CurrencyInput
            value={form.budget_max}
            invalid={Boolean(errors.budget_max)}
            placeholder="$400,000"
            onChange={(value) => setField("budget_max", value)}
            onBlur={() => showFieldError("budget_max")}
          />
        </Field>

        <Field label="Notes" className={isCompact ? "md:col-span-2" : "sm:col-span-2"}>
          <textarea
            className="input min-h-[120px]"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Motivation, timeline, preferences..."
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
