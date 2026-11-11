"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { EmailInput } from "@/components/ui/formatted-inputs";
import { emailError } from "@/lib/input-format";
import { AuthFrame } from "@/components/auth/auth-frame";
import {
  COMPANY_SLUG_RE,
  normalizeCompanySlug,
  readStoredCompanySlug,
} from "@/lib/company-slug";

/**
 * Forgot password. Asks for the company slug as well as the email, because
 * one email can belong to people in two companies. The answer is the same
 * whether or not the account exists; it only differs when this Joist can't
 * send email at all, which says nothing about any account.
 */
export default function ForgotPasswordPage() {
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // { mail: boolean, email, slug } once asked.
  const [sent, setSent] = useState(null);

  useEffect(() => {
    setSlug(readStoredCompanySlug());
  }, []);

  const normalizedSlug = normalizeCompanySlug(slug);
  const canSubmit = !submitting && COMPANY_SLUG_RE.test(normalizedSlug);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const nextEmailError = emailError(email, { required: true });
    if (nextEmailError) {
      setEmailFieldError(nextEmailError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ company_slug: normalizedSlug, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many requests for this account. Wait an hour, then try again.");
        return;
      }
      if (!res.ok) {
        setError("Check the company slug and email, then try again.");
        return;
      }
      setSent({ mail: Boolean(data.mail), email, slug: normalizedSlug });
    } catch {
      setError("Couldn’t reach Joist. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Forgot password"
      description="We’ll email you a link to set a new one."
    >
      {sent ? (
        <div className="space-y-4" data-testid="forgot-sent">
          {sent.mail ? (
            <Alert tone="success">
              If {sent.email} has an account at {sent.slug}, we’ve emailed it a link to
              set a new password. The link lasts an hour.
            </Alert>
          ) : (
            <Alert tone="info">
              This Joist can’t send email yet. Ask an owner or admin at your company to
              send you a reset link from the Team page.
            </Alert>
          )}
          <Link href="/login" className="btn w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Company slug"
            htmlFor="forgot-slug"
            required
            help="The one you sign in with."
          >
            <input
              id="forgot-slug"
              type="text"
              placeholder="northside-roofing"
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field label="Email" htmlFor="forgot-email" required error={emailFieldError}>
            <EmailInput
              id="forgot-email"
              placeholder="you@example.com"
              value={email}
              invalid={Boolean(emailFieldError)}
              onChange={(value) => {
                setEmail(value);
                if (emailFieldError) setEmailFieldError("");
              }}
              onBlur={() => setEmailFieldError(emailError(email, { required: true }))}
              required
            />
          </Field>

          {error ? <Alert variant="inline">{error}</Alert> : null}

          <FormActions>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!canSubmit}
            >
              {submitting ? "Sending…" : "Email me a link"}
            </button>
          </FormActions>

          <p className="text-center text-sm text-muted">
            <Link href="/login" className="font-medium text-accent">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthFrame>
  );
}
