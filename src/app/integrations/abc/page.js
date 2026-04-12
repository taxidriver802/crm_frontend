"use client";

import { useEffect, useMemo, useState } from "react";
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

function BoolBadge({ ok }) {
  return <StatusBadge tone={ok ? "success" : "danger"}>{ok ? "Yes" : "No"}</StatusBadge>;
}

function SectionCard({ title, children, right }) {
  return (
    <div className="card rounded-lg">
      <div className="border-base flex items-center justify-between border-b p-4">
        <div className="text-sm font-medium">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="text-muted text-sm">{label}</div>
      <div className="text-right text-sm font-medium">{value}</div>
    </div>
  );
}

function getIntegrationHealth(data) {
  if (!data) {
    return {
      label: "Unknown",
      tone: "neutral",
      description: "No integration data is available yet.",
    };
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

  if (ready) {
    return {
      label: "Ready for testing",
      tone: "success",
      description:
        "Core ABC settings are present. This integration is ready for incremental testing and future workflow expansion.",
    };
  }

  if (partial) {
    return {
      label: "Partially configured",
      tone: "warning",
      description:
        "Some ABC settings are present, but setup is incomplete. Finish configuration before relying on live actions.",
    };
  }

  return {
    label: "Not configured",
    tone: "danger",
    description:
      "ABC Supply integration has not been configured yet. Add environment values before enabling live integration features.",
  };
}

export default function AbcIntegrationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricingSample, setPricingSample] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/integrations/abc/status");
      setData(res.integration);
    } catch (e) {
      setError(e.message || "Failed to load integration status");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadPricingSample() {
    try {
      setPricingLoading(true);
      setPricingError("");
      const res = await api("/integrations/abc/pricing-sample?q=roof");
      setPricingSample(res);
    } catch (e) {
      setPricingError(e.message || "Pricing sample failed");
      setPricingSample(null);
    } finally {
      setPricingLoading(false);
    }
  }

  const health = useMemo(() => getIntegrationHealth(data), [data]);

  return (
    <AppShell title="ABC Supply Integration">
      <div className="space-y-6">
        {error ? (
          <div className="card rounded-lg p-4">
            <div className="text-sm font-medium">Couldn’t load integration</div>
            <div className="text-muted mt-1 text-sm">{error}</div>
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard
              title="Integration Health"
              right={
                !loading ? (
                  <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
                ) : null
              }
            >
              {loading ? (
                <div className="text-muted text-sm">Loading…</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    {data?.provider ? data.provider : "ABC Supply"}
                  </div>
                  <div className="text-muted text-sm">{health.description}</div>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="lg:col-span-1">
            <SectionCard title="Actions">
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={load} disabled={loading}>
                  Refresh
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={loadPricingSample}
                  disabled={pricingLoading || loading}
                >
                  {pricingLoading ? "Loading…" : "Sample pricing lookup"}
                </button>
              </div>

              <div className="text-muted mt-3 text-sm">
                Sample pricing lookup runs a minimal item search against ABC when
                credentials are configured (Phase 9.5).
              </div>
              {pricingError ? (
                <div className="mt-2 text-sm text-red-600">{pricingError}</div>
              ) : null}
              {pricingSample?.data != null ? (
                <div className="text-muted mt-3 max-h-40 overflow-auto rounded border border-dashed p-2 font-mono text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(pricingSample.data, null, 2)}
                  </pre>
                </div>
              ) : null}
            </SectionCard>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Credentials & Secrets">
            {loading ? (
              <div className="text-muted text-sm">Loading…</div>
            ) : data ? (
              <div className="divide-base divide-y">
                <Row label="Configured" value={<BoolBadge ok={data.configured} />} />
                <Row
                  label="Access Token"
                  value={<BoolBadge ok={data.hasAccessToken} />}
                />
                <Row label="Client ID" value={<BoolBadge ok={data.hasClientId} />} />
                <Row
                  label="Client Secret"
                  value={<BoolBadge ok={data.hasClientSecret} />}
                />
                <Row
                  label="Webhook Secret"
                  value={<BoolBadge ok={data.hasWebhookSecret} />}
                />
              </div>
            ) : (
              <div className="text-muted text-sm">No integration data available.</div>
            )}
          </SectionCard>

          <SectionCard title="Provider Details">
            {loading ? (
              <div className="text-muted text-sm">Loading…</div>
            ) : data ? (
              <div className="divide-base divide-y">
                <Row label="Provider" value={data.provider} />
                <Row label="Account ID" value={data.accountId || "Not set"} />
              </div>
            ) : (
              <div className="text-muted text-sm">No integration data available.</div>
            )}
          </SectionCard>
        </section>

        {!loading && data && health.tone !== "success" ? (
          <SectionCard title="Recommended Next Steps">
            <div className="space-y-2 text-sm">
              {!data.configured ? (
                <div className="text-muted">
                  Add `ABC_API_BASE_URL` to the backend environment.
                </div>
              ) : null}
              {!data.hasClientId ? (
                <div className="text-muted">Add `ABC_CLIENT_ID`.</div>
              ) : null}
              {!data.hasClientSecret ? (
                <div className="text-muted">Add `ABC_CLIENT_SECRET`.</div>
              ) : null}
              {!data.hasAccessToken ? (
                <div className="text-muted">
                  Add `ABC_ACCESS_TOKEN` for live request testing.
                </div>
              ) : null}
              {!data.hasWebhookSecret ? (
                <div className="text-muted">
                  Add `ABC_WEBHOOK_SECRET` when webhook validation is ready.
                </div>
              ) : null}
              {!data.accountId ? (
                <div className="text-muted">
                  Add `ABC_ACCOUNT_ID` when supplier account details are available.
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </AppShell>
  );
}
