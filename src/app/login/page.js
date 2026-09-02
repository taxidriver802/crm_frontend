"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
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
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <Alert>{error}</Alert> : null}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthFrame>
  );
}
