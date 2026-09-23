"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { AuthFrame } from "@/components/auth/auth-frame";
import { writeStoredCompanySlug } from "@/lib/company-slug";
import { useThemeController } from "@/components/theme/theme-controller";

function AcceptInvitePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCompanyPaletteId } = useThemeController();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyBrand, setCompanyBrand] = useState(null);
  const [inviteStatus, setInviteStatus] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadInvite() {
      try {
        const res = await fetch(
          `/api/users/invites/validate?token=${encodeURIComponent(token)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok) {
          setCompanyName(data.company_name || "");
          setInviteStatus("valid");
          writeStoredCompanySlug(data.company_slug);
          if (data.company_slug) {
            const brandRes = await fetch(
              `/api/public/companies/${encodeURIComponent(data.company_slug)}`,
              { credentials: "omit" }
            );
            const brandData = await brandRes.json().catch(() => ({}));
            if (!cancelled && brandRes.ok && brandData.company) {
              setCompanyBrand(brandData.company);
              if (brandData.company.palette_id) {
                setCompanyPaletteId(brandData.company.palette_id);
              }
            }
          }
        } else {
          setInviteStatus(data?.status || "invalid");
        }
      } catch {
        if (!cancelled) setInviteStatus("invalid");
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing invite token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to accept invite.");
        return;
      }

      writeStoredCompanySlug(data.company?.slug);
      if (data.company?.palette_id) setCompanyPaletteId(data.company.palette_id);
      setSuccess("Invite accepted. Redirecting…");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 800);
    } catch {
      setError("Something went wrong while accepting the invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Accept invite"
      companyName={companyBrand?.name || companyName}
      markId={companyBrand?.mark_id}
      logoUrl={companyBrand?.logo_url}
      description={
        companyName
          ? `Join ${companyName}. Set your password to activate your account.`
          : "Set your password to activate your account."
      }
    >
      {!token || (inviteStatus && inviteStatus !== "valid") ? (
        <Alert variant="inline">
          {!token
            ? "This invite link is missing a token or is invalid."
            : "This invite is no longer valid."}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New password" required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirm password" required>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              required
              autoComplete="new-password"
            />
          </Field>

          {error ? <Alert variant="inline">{error}</Alert> : null}

          {success ? (
            <Alert variant="inline" tone="success">
              {success}
            </Alert>
          ) : null}

          <FormActions>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
            >
              {submitting ? "Activating…" : "Activate account"}
            </button>
          </FormActions>
        </form>
      )}
    </AuthFrame>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthFrame title="Accept invite" description="Loading…">
          <div className="text-sm text-muted">Loading…</div>
        </AuthFrame>
      }
    >
      <AcceptInvitePageInner />
    </Suspense>
  );
}
