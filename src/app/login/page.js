"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      router.replace("/dashboard");
    } catch (err) {
      setError("Invalid credentials");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">Login</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
