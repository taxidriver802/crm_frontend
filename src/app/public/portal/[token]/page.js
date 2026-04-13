"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/helper";
import { PhotoGallery } from "@/components/photo-gallery";

function StatusBadge({ status, tone }) {
  const toneClass =
    tone === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-700"
      : tone === "warning"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700"
        : "border-base bg-surface text-main";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {status}
    </span>
  );
}

function formatDate(input) {
  if (!input) return "—";
  return new Date(input).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CustomerPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/public/portal/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "This link is invalid or has expired.");
        }
        return res.json();
      })
      .then((res) => setData(res.portal))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="bg-app text-main flex min-h-screen items-center justify-center">
        <div className="text-muted text-sm">Loading your project portal…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-app text-main flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md rounded-lg p-6 text-center">
          <div className="text-lg font-semibold">Portal Unavailable</div>
          <div className="text-muted mt-2 text-sm">
            {error || "This link is invalid or has expired."}
          </div>
        </div>
      </div>
    );
  }

  const { job, estimates, invoices, files } = data;

  return (
    <div className="bg-app text-main min-h-screen">
      <header className="border-base bg-surface border-b px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="text-xl font-semibold">{job.title}</div>
          <div className="text-muted mt-1 text-sm">Customer Project Portal</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Job Overview */}
        <section className="card rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Project Status</div>
              {job.address ? (
                <div className="text-muted mt-1 text-sm">{job.address}</div>
              ) : null}
              {job.description ? (
                <div className="text-muted mt-2 text-sm">{job.description}</div>
              ) : null}
            </div>
            <StatusBadge
              status={job.status}
              tone={job.status === "Closed Won" ? "success" : "warning"}
            />
          </div>
          {job.lead_name ? (
            <div className="border-base mt-4 border-t pt-3 text-sm">
              <span className="text-muted">Client: </span>
              <span>{job.lead_name}</span>
              {job.lead_email ? (
                <span className="text-muted"> • {job.lead_email}</span>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Estimates */}
        {estimates.length > 0 ? (
          <section className="card rounded-lg p-4">
            <div className="mb-3 font-medium">Estimates</div>
            <div className="space-y-3">
              {estimates.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{est.title}</div>
                    <div className="text-muted mt-1 text-xs">
                      {formatDate(est.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      ${formatCurrency(est.grand_total)}
                    </span>
                    <StatusBadge
                      status={est.status}
                      tone={est.status === "Approved" ? "success" : "warning"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Invoices */}
        {invoices.length > 0 ? (
          <section className="card rounded-lg p-4">
            <div className="mb-3 font-medium">Invoices</div>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{inv.invoice_number}</div>
                    <div className="text-muted mt-1 text-xs">
                      {formatDate(inv.created_at)}
                      {inv.due_date ? ` • Due ${formatDate(inv.due_date)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      ${formatCurrency(inv.grand_total)}
                    </span>
                    <StatusBadge
                      status={inv.status}
                      tone={
                        inv.status === "Paid"
                          ? "success"
                          : inv.status === "Overdue"
                            ? "warning"
                            : ""
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Photos */}
        {files.length > 0 ? (
          <section className="card rounded-lg p-4">
            <div className="mb-3 font-medium">Project Photos</div>
            <PhotoGallery files={files} loading={false} />
          </section>
        ) : null}

        <footer className="text-muted pb-8 text-center text-xs">
          This portal was generated for your convenience. Contact your project manager for
          questions.
        </footer>
      </main>
    </div>
  );
}
