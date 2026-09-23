"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { writeStoredCompanySlug } from "@/lib/company-slug";
import { MarkPicker, DEFAULT_COMPANY_MARK_ID } from "@/components/brand/company-mark";
import { useThemeController } from "@/components/theme/theme-controller";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function RegisterPage() {
  const router = useRouter();
  const { setCompanyPaletteId } = useThemeController();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [markId, setMarkId] = useState(DEFAULT_COMPANY_MARK_ID);
  const [showMark, setShowMark] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setSubmitting(true);

      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          company_name: companyName,
          slug: slug.trim() || undefined,
          mark_id: markId !== DEFAULT_COMPANY_MARK_ID ? markId : undefined,
        }),
      });

      writeStoredCompanySlug(data.company?.slug);
      if (data.company?.palette_id) setCompanyPaletteId(data.company.palette_id);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not create the company."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Create a company"
      description="Set up your workspace. You will be the owner."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Company name" htmlFor="register-company" required>
          <input
            id="register-company"
            type="text"
            placeholder="Northside Roofing"
            className="input"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
          />
        </Field>

        <Field
          label="Company slug"
          htmlFor="register-slug"
          help="Letters, numbers, and hyphens. Leave blank to generate from the company name."
        >
          <input
            id="register-slug"
            type="text"
            placeholder="northside-roofing"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <div>
          <button
            type="button"
            className="text-sm font-medium text-accent"
            onClick={() => setShowMark((open) => !open)}
            aria-expanded={showMark}
          >
            {showMark ? "Hide company mark" : "Choose a company mark"}
          </button>
          {showMark ? (
            <div className="mt-3">
              <MarkPicker value={markId} onChange={setMarkId} />
              <p className="field-help mt-2">
                Optional. You can change this later in Settings → Company look.
              </p>
            </div>
          ) : null}
        </div>

        <Field label="First name" htmlFor="register-first" required>
          <input
            id="register-first"
            type="text"
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
        </Field>

        <Field label="Last name" htmlFor="register-last" required>
          <input
            id="register-last"
            type="text"
            className="input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />
        </Field>

        <Field label="Email" htmlFor="register-email" required>
          <input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Password" htmlFor="register-password" required>
          <input
            id="register-password"
            type="password"
            placeholder="At least 8 characters"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        {error ? <Alert variant="inline">{error}</Alert> : null}

        <FormActions>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating…" : "Create company"}
          </button>
        </FormActions>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
