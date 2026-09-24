"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { EmailInput } from "@/components/ui/formatted-inputs";
import { emailError } from "@/lib/input-format";
import { AuthFrame } from "@/components/auth/auth-frame";
import { useThemeController } from "@/components/theme/theme-controller";
import { usePwaInstall } from "@/lib/pwa";
import {
  COMPANY_SLUG_RE,
  clearStoredCompanySlug,
  normalizeCompanySlug,
  readStoredCompanySlug,
  writeStoredCompanySlug,
} from "@/lib/company-slug";

export default function LoginPage() {
  const router = useRouter();
  const { setCompanyPaletteId } = useThemeController();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [resolvedCompany, setResolvedCompany] = useState(null);
  const [unknownSlug, setUnknownSlug] = useState("");
  const [error, setError] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSlug(readStoredCompanySlug());
  }, []);

  const normalizedSlug = useMemo(() => normalizeCompanySlug(slug), [slug]);
  const slugIsUnknown =
    Boolean(normalizedSlug) && unknownSlug === normalizedSlug;
  const canSubmit =
    !submitting && COMPANY_SLUG_RE.test(normalizedSlug) && !slugIsUnknown;

  useEffect(() => {
    if (!normalizedSlug || !COMPANY_SLUG_RE.test(normalizedSlug)) {
      setResolvedCompany(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/companies/${encodeURIComponent(normalizedSlug)}`,
          { signal: controller.signal, credentials: "omit" }
        );
        if (controller.signal.aborted) return;
        if (res.status === 404) {
          setResolvedCompany(null);
          setUnknownSlug(normalizedSlug);
          setCompanyPaletteId(null);
          if (readStoredCompanySlug() === normalizedSlug) {
            clearStoredCompanySlug();
          }
          return;
        }
        if (!res.ok) {
          setResolvedCompany(null);
          return;
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        setResolvedCompany(data.company || null);
        setUnknownSlug((current) =>
          current === normalizedSlug ? "" : current
        );
        if (data.company?.palette_id) {
          setCompanyPaletteId(data.company.palette_id);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setResolvedCompany(null);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedSlug]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const nextEmailError = emailError(email, { required: true });
    if (nextEmailError) {
      setEmailFieldError(nextEmailError);
      return;
    }
    setEmailFieldError("");
    setError("");

    try {
      setSubmitting(true);

      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          company_slug: normalizedSlug,
        }),
      });

      writeStoredCompanySlug(data.company?.slug || normalizedSlug);
      if (data.company?.palette_id) setCompanyPaletteId(data.company.palette_id);
      router.replace("/dashboard");
    } catch {
      setError("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Sign in"
      companyName={resolvedCompany?.name}
      markId={resolvedCompany?.mark_id}
      logoUrl={resolvedCompany?.logo_url}
      description={
        resolvedCompany?.name
          ? `Sign in to ${resolvedCompany.name}.`
          : "Access your CRM workspace."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Company slug"
          htmlFor="login-slug"
          required
          error={slugIsUnknown ? "Unknown company" : undefined}
          help={
            slugIsUnknown
              ? undefined
              : resolvedCompany?.name ||
                "Letters, numbers, and hyphens. This picks which company to sign into."
          }
        >
          <input
            id="login-slug"
            type="text"
            placeholder="northside-roofing"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
        </Field>

        <Field label="Email" htmlFor="login-email" required error={emailFieldError}>
          <EmailInput
            id="login-email"
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

        <Field label="Password" htmlFor="login-password" required>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>

        {error ? <Alert variant="inline">{error}</Alert> : null}

        <FormActions>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!canSubmit}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </FormActions>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Starting a new workspace?{" "}
        <Link href="/register" className="font-medium text-accent">
          Create a company
        </Link>
      </p>
      <IosInstallHint />
    </AuthFrame>
  );
}

function IosInstallHint() {
  const { showIosHint, dismiss } = usePwaInstall();
  if (!showIosHint) return null;

  return (
    <div className="mt-4">
      <Alert tone="info">
        <p>Install CRM from Safari: tap Share, then Add to Home Screen.</p>
        <button type="button" className="btn mt-2 px-3 py-1.5 text-xs" onClick={dismiss}>
          Dismiss
        </button>
      </Alert>
    </div>
  );
}
