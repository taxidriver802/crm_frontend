"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { AuthFrame } from "@/components/auth/auth-frame";
import { writeStoredCompanySlug } from "@/lib/company-slug";
import { useThemeController } from "@/components/theme/theme-controller";

const NOT_VALID = {
  expired: "This link has expired. Links last an hour.",
  used: "This link has already been used.",
  superseded: "A newer link was sent after this one. Use the newest one.",
  invalid: "This link isn’t valid.",
};

/** Sets a new password from a reset link, then signs this browser in. */
function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCompanyPaletteId } = useThemeController();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  // "" while checking, then "valid" or why not.
  const [status, setStatus] = useState(token ? "" : "invalid");
  const [person, setPerson] = useState(null);
  const [companyBrand, setCompanyBrand] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
          { credentials: "omit" },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!data?.ok) {
          setStatus(data?.status || "invalid");
          return;
        }
        if (data.company_slug) {
          const brandRes = await fetch(
            `/api/public/companies/${encodeURIComponent(data.company_slug)}`,
            { credentials: "omit" },
          );
          const brandData = await brandRes.json().catch(() => ({}));
          if (!cancelled && brandRes.ok && brandData.company) {
            setCompanyBrand(brandData.company);
            if (brandData.company.palette_id)
              setCompanyPaletteId(brandData.company.palette_id);
          }
        }
        if (cancelled) return;
        setPerson(data);
        setStatus("valid");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, setCompanyPaletteId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords don’t match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.status && NOT_VALID[data.status]) {
          setStatus(data.status);
        } else if (res.status === 429) {
          setError("Too many attempts. Wait a few minutes and try again.");
        } else {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "Check the new password and try again.",
          );
        }
        return;
      }
      writeStoredCompanySlug(data.company?.slug);
      if (data.company?.palette_id) setCompanyPaletteId(data.company.palette_id);
      setDone(true);
      router.replace("/dashboard");
    } catch {
      setError("Couldn’t reach Joist. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const company =
    companyBrand || (person?.company_name ? { name: person.company_name } : null);

  return (
    <AuthFrame
      title="Set a new password"
      company={company}
      pending={status === ""}
      description={
        person
          ? `For ${person.email} at ${person.company_name}. Every other device signs out.`
          : "Choose a new password for your account."
      }
    >
      {status !== "" && status !== "valid" ? (
        <div className="space-y-4" data-testid="reset-unavailable">
          <Alert variant="inline">{NOT_VALID[status] || NOT_VALID.invalid}</Alert>
          <Link href="/forgot-password" className="btn btn-primary w-full">
            Ask for a new link
          </Link>
          <p className="text-center text-sm text-muted">
            <Link href="/login" className="font-medium text-accent">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : status === "valid" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New password" htmlFor="reset-password" required>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="reset-confirm" required>
            <input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              required
              autoComplete="new-password"
            />
          </Field>
          {error ? <Alert variant="inline">{error}</Alert> : null}
          <FormActions>
            <button
              type="submit"
              disabled={submitting || done}
              className="btn btn-primary w-full"
            >
              {done
                ? "Signing you in…"
                : submitting
                  ? "Saving…"
                  : "Set password and sign in"}
            </button>
          </FormActions>
        </form>
      ) : (
        <div className="text-sm text-muted">Checking the link…</div>
      )}
    </AuthFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthFrame title="Set a new password" description="Loading…" pending>
          <div className="text-sm text-muted">Loading…</div>
        </AuthFrame>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
