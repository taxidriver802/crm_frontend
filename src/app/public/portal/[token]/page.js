"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/helper";
import { PhotoGallery } from "@/components/photo-gallery";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { ListRow } from "@/components/ui/list-row";
import { MetaItem, MetaList } from "@/components/ui/meta";
import { EmptyState } from "@/components/error-boundary";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { PublicFrame } from "@/components/public/public-frame";
import { publicBrandProps, usePublicCompanyTheme } from "@/components/brand/company-mark";
import { cx } from "@/lib/cx";
import { paymentMethodLabel } from "@/lib/job-lifecycle";

/** Customer-facing progress: the steps a homeowner cares about, not sales stages. */
function ProjectSteps({ stage }) {
  if (!stage || !Array.isArray(stage.steps) || stage.steps.length === 0) return null;
  return (
    <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Project progress">
      {stage.steps.map((label, index) => {
        const done = index < stage.step;
        const current = index === stage.step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={cx(
              "rounded-theme-md border px-2 py-1.5 text-center text-xs font-medium",
              current
                ? "border-transparent bg-accent-solid text-on-accent"
                : done
                  ? "border-transparent bg-accent-soft text-main"
                  : "border-base text-muted",
            )}
          >
            {label}
          </li>
        );
      })}
    </ol>
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

  async function load() {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/public/portal/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "This link is invalid or has expired.");
      }
      const json = await res.json();
      setData(json.portal);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  usePublicCompanyTheme(data?.company);

  if (loading) {
    return (
      <PublicFrame eyebrow="Customer portal" title="Your project">
        <SectionCard title="Project status">
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </SectionCard>
      </PublicFrame>
    );
  }

  if (error || !data) {
    return (
      <PublicFrame eyebrow="Customer portal" title="Portal unavailable">
        <EmptyState
          title="This portal is unavailable"
          description={error || "This link is invalid or has expired."}
        />
      </PublicFrame>
    );
  }

  const {
    job,
    estimates,
    invoices,
    files,
    timeline = [],
    company,
    stage,
    money = {},
    payments = [],
  } = data;

  return (
      <PublicFrame
        eyebrow="Customer portal"
        title={job.title}
        description={job.address || undefined}
        footer="This portal was generated for your convenience. Contact your project manager for questions."
        {...publicBrandProps(company)}
      >
      <SectionCard title="Project status">
        <p className="font-medium" data-testid="portal-stage">
          {stage?.label || "Your project"}
        </p>
        <ProjectSteps stage={stage} />
        {job.description ? (
          <p className="mt-4 text-sm text-muted">{job.description}</p>
        ) : null}
        {job.lead_name ? (
          <MetaList className={job.description ? "mt-4" : ""}>
            <MetaItem label="Client">
              {job.lead_name}
              {job.lead_email ? ` · ${job.lead_email}` : ""}
            </MetaItem>
          </MetaList>
        ) : null}
      </SectionCard>

      {money.contract_total > 0 || money.invoiced_total > 0 ? (
        <SectionCard title="Payments">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetaItem label="Project total">${formatCurrency(money.contract_total)}</MetaItem>
            <MetaItem label="Billed">${formatCurrency(money.invoiced_total)}</MetaItem>
            <MetaItem label="Paid">${formatCurrency(money.paid_total)}</MetaItem>
            <MetaItem label="Balance due">
              <span
                className={money.overdue_total > 0 ? "text-danger" : undefined}
                data-testid="portal-balance"
              >
                ${formatCurrency(money.balance_due)}
              </span>
            </MetaItem>
          </div>
          {payments.length > 0 ? (
            <div className="mt-4 space-y-2">
              {payments.map((payment) => (
                <ListRow key={payment.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    {formatDate(payment.received_at)} · {paymentMethodLabel(payment.method)}
                    <span className="text-muted"> · {payment.invoice_number}</span>
                  </div>
                  <div className="shrink-0 font-semibold">
                    ${formatCurrency(payment.amount)}
                  </div>
                </ListRow>
              ))}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Progress">
        {timeline.length === 0 ? (
          <EmptyState
            title="No updates yet"
            description="Project milestones will show up here as work moves forward."
          />
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => (
              <ListRow key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm font-medium">{item.label}</div>
                <div className="shrink-0 text-xs text-muted">{formatDate(item.at)}</div>
              </ListRow>
            ))}
          </div>
        )}
      </SectionCard>

      {estimates.length > 0 ? (
        <SectionCard title="Estimates">
          <div className="space-y-2">
            {estimates.map((est) => (
              <ListRow key={est.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{est.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {est.is_change_order ? "Change order · " : ""}
                    {formatDate(est.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    ${formatCurrency(est.grand_total)}
                  </span>
                  <StatusBadge kind="estimate" status={est.status} />
                </div>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {invoices.length > 0 ? (
        <SectionCard title="Invoices">
          <div className="space-y-2">
            {invoices.map((inv) => (
              <ListRow key={inv.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <a
                    className="font-medium underline underline-offset-4 hover:opacity-80"
                    href={`${API_BASE}/public/portal/${token}/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {inv.invoice_number}
                  </a>
                  <div className="mt-1 text-xs text-muted">
                    {inv.kind === "deposit" ? "Deposit · " : ""}
                    {formatDate(inv.created_at)}
                    {inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}
                    {inv.balance_due > 0 ? ` · $${formatCurrency(inv.balance_due)} due` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    ${formatCurrency(inv.grand_total)}
                  </span>
                  <StatusBadge kind="invoice" status={inv.status} />
                </div>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Project photos">
        <PhotoGallery
          files={files.map((file) => ({
            ...file,
            url: `${API_BASE}/public/portal/${token}/files/${file.id}`,
          }))}
          loading={false}
          emptyTitle="No photos shared yet."
          emptyDescription=""
        />
      </SectionCard>
    </PublicFrame>
  );
}
