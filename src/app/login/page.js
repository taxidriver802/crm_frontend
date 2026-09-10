"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setSubmitting(true);

      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      router.replace("/dashboard");
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame title="Sign in" description="Access your CRM workspace.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" htmlFor="login-email" required>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </FormActions>
      </form>
    </AuthFrame>
  );
}
