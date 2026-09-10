"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { DetailSkeleton } from "@/components/loading/loadingSkeletons";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { PageToolbar } from "@/components/page-toolbar";
import { Icon } from "@/components/icons";

export default function QuickBooksPage() {
  const { askConfirm, confirmModal } = useConfirmModal();
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

  function handleDisconnect() {
    askConfirm({
      title: "Disconnect QuickBooks?",
      description: "You can reconnect anytime. Existing synced data is not deleted.",
      confirmLabel: "Disconnect",
      onConfirm: async () => {
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
      },
    });
  }

  const isConnected = status?.connected;
  const isConfigured = status?.hasClientId && status?.hasClientSecret;

  const connectionLabel = isConnected
    ? "Connected"
    : isConfigured
      ? "Ready to connect"
      : "Not configured";

  return (
    <AppShell
      title="QuickBooks"
      description={loading ? "Loading…" : connectionLabel}
    >
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <PageToolbar
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={loadStatus}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
          create={
            !loading && isConfigured && !isConnected ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={busy}
              >
                {busy ? "Connecting…" : "Connect"}
              </button>
            ) : null
          }
        />

        <SectionCard
          title="Connection"
          description="Sync invoices and track payment status through QuickBooks Online."
          size="lg"
          right={
            loading ? null : (
              <StatusBadge
                tone={isConnected ? "success" : isConfigured ? "warning" : "danger"}
              >
                {connectionLabel}
              </StatusBadge>
            )
          }
        >
          {loading ? (
            <DetailSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-muted text-xs">Client ID</div>
                  <div className="mt-1">
                    {status?.hasClientId ? "Configured" : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-xs">Client secret</div>
                  <div className="mt-1">
                    {status?.hasClientSecret ? "Configured" : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-xs">Status</div>
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
                    <div className="text-muted text-xs">Token expires</div>
                    <div className="mt-1">
                      {new Date(status.token_expires_at).toLocaleString()}
                    </div>
                  </div>
                ) : null}
              </div>

              {isConnected ? (
                <button
                  type="button"
                  className="btn btn-danger px-4 py-2 text-sm"
                  onClick={handleDisconnect}
                  disabled={busy}
                >
                  {busy ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : !isConfigured ? (
                <div className="text-muted text-sm">
                  Set <code className="text-xs">QB_CLIENT_ID</code>,{" "}
                  <code className="text-xs">QB_CLIENT_SECRET</code>, and{" "}
                  <code className="text-xs">QB_REDIRECT_URI</code> in your backend
                  environment to enable this integration.
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard title="How it works" size="lg">
          <div className="text-muted text-sm leading-relaxed">
            Once connected, you can sync invoices from the CRM directly to QuickBooks
            Online. Payment status is pulled back automatically so your CRM invoice
            reflects the latest state.
          </div>
          <ul className="text-muted mt-3 list-inside list-disc space-y-1 text-sm">
            <li>Open any invoice and click Sync to QuickBooks to push it</li>
            <li>Invoice line items, totals, and due dates are mapped automatically</li>
            <li>Payment status syncs back when checked</li>
            <li>Tokens refresh automatically; reconnect if prompted</li>
          </ul>
        </SectionCard>
      </div>
      {confirmModal}
    </AppShell>
  );
}
