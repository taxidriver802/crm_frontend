"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/helper";
import { PublicFrame } from "@/components/public/public-frame";
import { SectionCard } from "@/components/ui/section-card";
import { Field, FormActions } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/error-boundary";

const SERVICE_OPTIONS = [
  "Inspection",
  "Repair",
  "Replacement",
  "Gutters",
  "Maintenance",
];
const CONTACT_OPTIONS = ["Call", "Text", "Email"];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  service_type: "",
  preferred_contact_method: "",
  message: "",
  company_website: "",
};

export default function PublicIntakePage() {
  const { token } = useParams();
  const rawToken = useMemo(
    () => (Array.isArray(token) ? token[0] : token) || "",
    [token],
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (saving || !rawToken) return;
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Please provide an email or phone number.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/public/intake/${encodeURIComponent(rawToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            service_type: form.service_type || null,
            preferred_contact_method: form.preferred_contact_method || null,
            message: form.message.trim() || null,
            company_website: form.company_website,
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("This request form is unavailable.");
        }
        if (res.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        }
        throw new Error(body?.error || "Unable to submit");
      }
      setDone(true);
    } catch (e) {
      setError(e.message || "Unable to submit");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setDone(false);
    setError("");
  }, [rawToken]);

  if (!rawToken) {
    return (
      <PublicFrame eyebrow="Request a quote" title="Form unavailable">
        <EmptyState
          title="This form is unavailable"
          description="The intake link is missing or invalid."
        />
      </PublicFrame>
    );
  }

  if (done) {
    return (
      <PublicFrame
        eyebrow="Request a quote"
        title="Thanks — we got it"
        description="Someone from our team will follow up soon."
        width="narrow"
      >
        <SectionCard title="Submission received">
          <p className="text-sm leading-relaxed">
            Your request was sent successfully. You can close this page.
          </p>
        </SectionCard>
      </PublicFrame>
    );
  }

  return (
    <PublicFrame
      eyebrow="Request a quote"
      title="Tell us about your project"
      description="Share a few details and we will get back to you."
      width="narrow"
      footer="Your information is sent securely to our team."
    >
      <SectionCard title="Contact details">
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? <Alert variant="inline">{error}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                required
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last name" required>
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                required
                autoComplete="family-name"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" help="Email or phone is required">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service">
              <select
                className="input"
                value={form.service_type}
                onChange={(e) => setField("service_type", e.target.value)}
              >
                <option value="">Select…</option>
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred contact">
              <select
                className="input"
                value={form.preferred_contact_method}
                onChange={(e) =>
                  setField("preferred_contact_method", e.target.value)
                }
              >
                <option value="">Select…</option>
                {CONTACT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Message">
            <textarea
              className="input min-h-[120px] resize-y"
              value={form.message}
              onChange={(e) => setField("message", e.target.value)}
              placeholder="Describe the project, timing, or questions…"
              maxLength={2000}
            />
          </Field>

          {/* Honeypot — hidden from people, filled by some bots */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
          >
            <label>
              Company website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.company_website}
                onChange={(e) => setField("company_website", e.target.value)}
              />
            </label>
          </div>

          <FormActions>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Sending…" : "Submit request"}
            </button>
          </FormActions>
        </form>
      </SectionCard>
    </PublicFrame>
  );
}
