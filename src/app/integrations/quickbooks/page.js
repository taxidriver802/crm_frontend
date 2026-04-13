"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { DetailSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import Link from "next/link";

function StatusBadge({ tone = "neutral", children }) {
  const toneClass =
    tone === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-700"
      : tone === "warning"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700"
        : tone === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-700"
          : "border-base bg-surface text-main";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export default function QuickBooksPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const res = await api("/integrations/quickbooks/status");
      setStatus(res.integration || null);
    } catch (e) {
      setError(e?.message || "Failed to load QuickBooks status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleConnect() {
    setBusy(true);
    setError("");
    try {
      const res = await api("/integrations/quickbooks/auth-url");
      if (res.auth_url) {
        window.location.href = res.auth_url;
      }
    } catch (e) {
      setError(e?.message || "Failed to start OAuth flow");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm("Disconnect QuickBooks?");
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await api("/integrations/quickbooks/disconnect", { method: "POST" });
      await loadStatus();
    } catch (e) {
      setError(e?.message || "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  }

  const isConnected = status?.connected;
  const isConfigured = status?.hasClientId && status?.hasClientSecret;

  return (
    <AppShell title="QuickBooks Integration">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/integrations" className="text-muted text-sm hover:underline">
            ← Integrations
          </Link>
        </div>

        {error ? <PageError message={error} onRetry={loadStatus} /> : null}

        <section className="card rounded-lg p-4">
          {loading ? (
            <DetailSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">QuickBooks Online</div>
                  <div className="text-muted mt-1 text-sm">
                    Sync invoices and track payment status through QuickBooks Online.
                  </div>
                </div>
                <StatusBadge
                  tone={isConnected ? "success" : isConfigured ? "warning" : "danger"}
                >
                  {isConnected
                    ? "Connected"
                    : isConfigured
                      ? "Ready to connect"
                      : "Not configured"}
                </StatusBadge>
              </div>

              <div className="border-base border-t pt-4">
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted text-xs">Client ID</div>
                    <div className="mt-1">
                      {status?.hasClientId ? "Configured" : "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-xs">Client Secret</div>
                    <div className="mt-1">
                      {status?.hasClientSecret ? "Configured" : "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-xs">Connection Status</div>
                    <div className="mt-1">{status?.status || "disconnected"}</div>
                  </div>
                  {status?.realm_id ? (
                    <div>
                      <div className="text-muted text-xs">Realm ID</div>
                      <div className="mt-1">{status.realm_id}</div>
                    </div>
                  ) : null}
                  {status?.token_expires_at ? (
                    <div>
                      <div className="text-muted text-xs">Token Expires</div>
                      <div className="mt-1">
                        {new Date(status.token_expires_at).toLocaleString()}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-base flex flex-wrap gap-2 border-t pt-4">
                {isConnected ? (
                  <button
                    type="button"
                    className="btn px-4 py-2 text-sm text-red-600"
                    onClick={handleDisconnect}
                    disabled={busy}
                  >
                    {busy ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : isConfigured ? (
                  <button
                    type="button"
                    className="btn px-4 py-2 text-sm"
                    onClick={handleConnect}
                    disabled={busy}
                  >
                    {busy ? "Connecting…" : "Connect to QuickBooks"}
                  </button>
                ) : (
                  <div className="text-muted text-sm">
                    Set <code className="text-xs">QB_CLIENT_ID</code>,{" "}
                    <code className="text-xs">QB_CLIENT_SECRET</code>, and{" "}
                    <code className="text-xs">QB_REDIRECT_URI</code> in your backend
                    environment to enable this integration.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card rounded-lg p-4">
          <div className="space-y-3">
            <div className="font-medium">How it works</div>
            <div className="text-muted text-sm leading-relaxed">
              Once connected, you can sync invoices from the CRM directly to QuickBooks
              Online. Payment status is pulled back automatically so your CRM invoice
              reflects the latest state.
            </div>
            <ul className="text-muted list-inside list-disc space-y-1 text-sm">
              <li>Open any invoice and click "Sync to QuickBooks" to push it</li>
              <li>Invoice line items, totals, and due dates are mapped automatically</li>
              <li>Payment status syncs back when checked</li>
              <li>Tokens refresh automatically; reconnect if prompted</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
