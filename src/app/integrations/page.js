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

function IntegrationCard({ title, description, href, health, loading }) {
  return (
    <Link
      href={href}
      className="bg-surface border-base hover:bg-accent-soft block rounded-lg border p-4 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-muted mt-1 text-sm">{description}</div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/integrations/abc/status");
      setAbc(res.integration);
    } catch (e) {
      setError(e.message || "Failed to load integrations");
      setAbc(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const abcHealth = getIntegrationHealth(abc);

  return (
    <AppShell title="Integrations">
      <div className="space-y-6">
        {error ? (
          <div className="bg-surface border-base rounded-lg border p-4">
            <div className="text-sm font-medium">Couldn’t load integrations</div>
            <div className="text-muted mt-1 text-sm">{error}</div>
          </div>
        ) : null}

        <div className="bg-surface border-base rounded-lg border p-4">
          <div className="text-sm font-medium">Connected Systems</div>
          <div className="text-muted mt-1 text-sm">
            Manage third-party providers and prepare future integrations.
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <IntegrationCard
            title="ABC Supply"
            description="Supplier integration for account status, catalog access, branches, invoices, and order workflows."
            href="/integrations/abc"
            health={abcHealth}
            loading={loading}
          />

          <div className="bg-surface border-base rounded-lg border p-4 opacity-70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">More integrations coming</div>
                <div className="text-muted mt-1 text-sm">
                  This space is ready for future providers like email sync, calendar sync,
                  or listing platforms.
                </div>
              </div>
              <StatusBadge>Planned</StatusBadge>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
