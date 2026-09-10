"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { AuthFrame } from "@/components/auth/auth-frame";

function AcceptInvitePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      description="Set your password to activate your account."
    >
      {!token ? (
        <Alert variant="inline">This invite link is missing a token or is invalid.</Alert>
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
            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
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
          <div className="text-muted text-sm">Loading…</div>
        </AuthFrame>
      }
    >
      <AcceptInvitePageInner />
    </Suspense>
  );
}
