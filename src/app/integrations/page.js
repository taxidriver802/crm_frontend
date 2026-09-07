"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { Alert } from "@/components/ui/alert";

const INTAKE_URL_STORAGE_KEY = "crm-intake-public-url";

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

function readStoredIntakeUrl() {
  try {
    return localStorage.getItem(INTAKE_URL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredIntakeUrl(url) {
  try {
    if (url) localStorage.setItem(INTAKE_URL_STORAGE_KEY, url);
    else localStorage.removeItem(INTAKE_URL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function IntegrationsPage() {
  const { askConfirm, confirmModal } = useConfirmModal();
  const [abc, setAbc] = useState(null);
  const [qb, setQb] = useState(null);
  const [intake, setIntake] = useState(null);
  const [intakeUrl, setIntakeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [error, setError] = useState("");
  const [intakeHint, setIntakeHint] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [abcRes, qbRes, intakeRes] = await Promise.allSettled([
        api("/integrations/abc/status"),
        api("/integrations/quickbooks/status"),
        api("/intake"),
      ]);
      if (abcRes.status === "fulfilled") setAbc(abcRes.value?.integration);
      if (qbRes.status === "fulfilled") setQb(qbRes.value?.integration);
      if (intakeRes.status === "fulfilled") {
        setIntake(intakeRes.value?.intake || null);
      } else {
        setIntake(null);
      }
      setIntakeUrl(readStoredIntakeUrl());
    } catch (e) {
      setError(e.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generateIntake() {
    setIntakeBusy(true);
    setIntakeHint("");
    try {
      const res = await api("/intake/generate", { method: "POST" });
      const url = res.public_url || "";
      setIntakeUrl(url);
      writeStoredIntakeUrl(url);
      setIntake((prev) => ({
        ...(prev || {}),
        configured: true,
        enabled: true,
        owned_by_current_user: true,
      }));
      if (navigator.clipboard?.writeText && url) {
        await navigator.clipboard.writeText(url);
        setIntakeHint("Intake link generated and copied.");
      } else {
        setIntakeHint("Intake link generated.");
      }
    } catch (e) {
      setError(e.message || "Failed to generate intake link");
    } finally {
      setIntakeBusy(false);
    }
  }

  function regenerateIntake() {
    askConfirm({
      title: "Regenerate intake link?",
      description:
        "The current website button URL will stop working. You will need to update the link on the company website.",
      confirmLabel: "Regenerate",
      onConfirm: async () => {
        setIntakeBusy(true);
        setIntakeHint("");
        try {
          const res = await api("/intake/regenerate", { method: "POST" });
          const url = res.public_url || "";
          setIntakeUrl(url);
          writeStoredIntakeUrl(url);
          setIntake((prev) => ({
            ...(prev || {}),
            configured: true,
            enabled: true,
            owned_by_current_user: true,
          }));
          if (navigator.clipboard?.writeText && url) {
            await navigator.clipboard.writeText(url);
            setIntakeHint("New intake link generated and copied.");
          } else {
            setIntakeHint("New intake link generated.");
          }
        } catch (e) {
          setError(e.message || "Failed to regenerate intake link");
        } finally {
          setIntakeBusy(false);
        }
      },
    });
  }

  async function copyIntakeUrl() {
    if (!intakeUrl) {
      setIntakeHint("Generate a link first to copy it.");
      return;
    }
    try {
      await navigator.clipboard.writeText(intakeUrl);
      setIntakeHint("Intake link copied.");
    } catch {
      setIntakeHint(intakeUrl);
    }
  }

  async function disableIntake() {
    setIntakeBusy(true);
    setIntakeHint("");
    try {
      await api("/intake", { method: "DELETE" });
      setIntake((prev) => ({ ...(prev || {}), enabled: false }));
      setIntakeHint("Intake link disabled. The public form will return unavailable.");
    } catch (e) {
      setError(e.message || "Failed to disable intake link");
    } finally {
      setIntakeBusy(false);
    }
  }

  async function enableIntake() {
    setIntakeBusy(true);
    setIntakeHint("");
    try {
      await api("/intake/enable", { method: "POST" });
      setIntake((prev) => ({ ...(prev || {}), enabled: true }));
      setIntakeHint("Intake link enabled again.");
    } catch (e) {
      setError(e.message || "Failed to enable intake link");
    } finally {
      setIntakeBusy(false);
    }
  }

  const abcHealth = getIntegrationHealth(abc);
  const qbHealth = getIntegrationHealth(qb);
  const intakeConfigured = Boolean(intake?.configured);
  const intakeEnabled = Boolean(intake?.enabled);

  return (
    <AppShell title="Integrations">
      {confirmModal}
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

        <section className="card rounded-lg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">Website intake link</div>
              <div className="text-muted mt-1 text-sm">
                Place this public URL behind a “Request a Quote” or “Get Started”
                button on the company website. Submissions create a New lead with
                source Website.
              </div>
            </div>
            {loading ? (
              <span className="text-muted text-xs">Loading…</span>
            ) : (
              <StatusBadge
                tone={
                  !intakeConfigured
                    ? "danger"
                    : intakeEnabled
                      ? "success"
                      : "warning"
                }
              >
                {!intakeConfigured
                  ? "Not configured"
                  : intakeEnabled
                    ? "Active"
                    : "Disabled"}
              </StatusBadge>
            )}
          </div>

          {intakeHint ? (
            <Alert variant="inline" className="mt-3">
              {intakeHint}
            </Alert>
          ) : null}

          {intakeUrl ? (
            <div className="bg-surface border-base mt-3 break-all rounded-md border px-3 py-2 text-sm">
              {intakeUrl}
            </div>
          ) : intakeConfigured ? (
            <div className="text-muted mt-3 text-xs">
              A link is active, but the raw URL is only shown when you generate or
              regenerate it. Generate again only if you can update the website
              button.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {!intakeConfigured ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={intakeBusy || loading}
                onClick={generateIntake}
              >
                {intakeBusy ? "Working…" : "Generate link"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={intakeBusy || !intakeUrl}
                  onClick={copyIntakeUrl}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={intakeBusy}
                  onClick={regenerateIntake}
                >
                  Regenerate
                </button>
                {intakeEnabled ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={intakeBusy}
                    onClick={disableIntake}
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={intakeBusy}
                    onClick={enableIntake}
                  >
                    Enable
                  </button>
                )}
              </>
            )}
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
