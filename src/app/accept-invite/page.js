"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
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

      setSuccess("Invite accepted. Redirecting...");
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
        <Alert>This invite link is missing a token or is invalid.</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              placeholder="At least 8 characters"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </label>

          {error ? <Alert>{error}</Alert> : null}

          {success ? <Alert tone="success">{success}</Alert> : null}

          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? "Activating..." : "Activate account"}
          </button>
        </form>
      )}
    </AuthFrame>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="bg-app text-main flex min-h-screen items-center justify-center px-4">
          <div className="text-muted text-sm">Loading…</div>
        </main>
      }
    >
      <AcceptInvitePageInner />
    </Suspense>
  );
}
