"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

function StatusBadge({ tone = "neutral", children }) {
  const toneClass =
    tone === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
      : tone === "warning"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
        : tone === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-base bg-surface text-main";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

function getIntegrationHealth(data) {
  if (!data) {
    return { label: "Unknown", tone: "neutral" };
  }

  const ready =
    data.configured && data.hasClientId && data.hasClientSecret && data.hasAccessToken;

  const partial =
    data.configured ||
    data.hasClientId ||
    data.hasClientSecret ||
    data.hasAccessToken ||
    data.hasWebhookSecret ||
    Boolean(data.accountId);

  if (ready) return { label: "Ready", tone: "success" };
  if (partial) return { label: "Partial", tone: "warning" };
  return { label: "Not configured", tone: "danger" };
}

function IntegrationCard({ title, description, href, health, loading, note }) {
  return (
    <Link href={href} className="card hover:bg-accent block rounded-lg p-4 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-muted mt-1 text-sm">{description}</div>
          {note ? <div className="text-muted mt-3 text-xs">{note}</div> : null}
        </div>

        {loading ? (
          <span className="text-muted text-xs">Loading…</span>
        ) : (
          <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
        )}
      </div>
    </Link>
  );
}

export default function IntegrationsPage() {
  const [abc, setAbc] = useState(null);
  const [qb, setQb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [abcRes, qbRes] = await Promise.allSettled([
        api("/integrations/abc/status"),
        api("/integrations/quickbooks/status"),
      ]);
      if (abcRes.status === "fulfilled") setAbc(abcRes.value?.integration);
      if (qbRes.status === "fulfilled") setQb(qbRes.value?.integration);
    } catch (e) {
      setError(e.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const abcHealth = getIntegrationHealth(abc);
  const qbHealth = getIntegrationHealth(qb);

  return (
    <AppShell title="Integrations">
      <div className="space-y-6">
        {error ? (
          <div className="card rounded-lg p-4">
            <div className="text-sm font-medium">Couldn’t load integrations</div>
            <div className="text-muted mt-1 text-sm">{error}</div>
          </div>
        ) : null}

        <section className="card rounded-lg p-4">
          <div className="text-sm font-medium">Connected Systems</div>
          <div className="text-muted mt-1 text-sm">
            Manage third-party providers, view setup readiness, and prepare future
            workflows. Some integrations are still scaffolded rather than fully live.
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <IntegrationCard
            title="ABC Supply"
            description="Supplier integration for account readiness, catalog access, branches, invoices, and future ordering workflows."
            href="/integrations/abc"
            health={abcHealth}
            loading={loading}
            note="Current page focuses on setup visibility and status, not full operational flows yet."
          />

          <IntegrationCard
            title="QuickBooks Online"
            description="Sync invoices to QuickBooks and pull back payment status for streamlined accounting."
            href="/integrations/quickbooks"
            health={qbHealth}
            loading={loading}
            note="OAuth2 connection required. Set QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI."
          />
        </section>
      </div>
    </AppShell>
  );
}
