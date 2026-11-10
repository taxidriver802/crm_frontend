"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/error-boundary";
import { ListRow } from "@/components/ui/list-row";
import { MetaItem } from "@/components/ui/meta";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { PublicFrame } from "@/components/public/public-frame";
import { publicBrandProps, usePublicCompanyTheme } from "@/components/brand/company-mark";
import { formatMoney, paymentMethodLabel } from "@/lib/job-lifecycle";

function formatDay(input) {
  if (!input) return "—";
  return new Date(input).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * What the client opens from an invoice share link: what the invoice is for,
 * what has been paid, and what is still due. Read-only; no payment capture.
 */
export default function PublicInvoicePage() {
  const { token } = useParams();
  const rawToken = Array.isArray(token) ? token[0] : token;
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!rawToken) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE}/public/invoices/${encodeURIComponent(rawToken)}`,
          { credentials: "omit" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "This link is invalid or has expired.");
        if (!alive) return;
        setInvoice(data.invoice);
        setCompany(data.company || null);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Could not load invoice");
        setInvoice(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [rawToken]);

  usePublicCompanyTheme(company);

  const pdfHref = rawToken
    ? `${API_BASE}/public/invoices/${encodeURIComponent(rawToken)}/pdf`
    : "#";
  const paidInFull = invoice && invoice.balance_due <= 0;

  return (
    <PublicFrame
      width="narrow"
      eyebrow={invoice?.kind === "deposit" ? "Deposit invoice" : "Invoice"}
      title={invoice ? invoice.invoice_number : "Invoice"}
      description={invoice?.job?.title || undefined}
      {...publicBrandProps(company)}
      pending={loading}
      footer={
        <Link href="/" className="underline-offset-4 hover:text-main hover:underline">
          Contractor sign in
        </Link>
      }
    >
      {error && !loading ? (
        <EmptyState title="This invoice is unavailable" description={error} />
      ) : null}

      {loading ? (
        <SectionCard title="Invoice">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </SectionCard>
      ) : invoice ? (
        <>
          <SectionCard
            title={paidInFull ? "Paid in full" : "Amount due"}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="invoice" status={invoice.status} />
                <a
                  href={pdfHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm px-3 py-1.5"
                >
                  View PDF
                </a>
              </div>
            }
          >
            <div
              className="text-3xl font-semibold tracking-tight"
              data-testid="public-invoice-balance"
            >
              {formatMoney(invoice.balance_due)}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <MetaItem label="Due">{formatDay(invoice.due_date)}</MetaItem>
              <MetaItem label="Invoice total">{formatMoney(invoice.grand_total)}</MetaItem>
              <MetaItem label="Paid so far">{formatMoney(invoice.amount_paid)}</MetaItem>
            </div>
            {invoice.status === "Overdue" ? (
              <Alert tone="warning" className="mt-4">
                This invoice is past due. Please contact us if you have already sent payment.
              </Alert>
            ) : null}
            {invoice.job?.lead_name ? (
              <p className="mt-4 text-sm text-muted">
                Billed to {invoice.job.lead_name}
                {invoice.job.address ? ` · ${invoice.job.address}` : ""}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="What this covers">
            <div className="space-y-2">
              {(invoice.line_items || []).map((item, index) => (
                <ListRow
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{item.name}</div>
                    {item.description ? (
                      <div className="mt-1 text-sm text-muted">{item.description}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 font-semibold">{formatMoney(item.line_total)}</div>
                </ListRow>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-base pt-4 text-sm">
              {invoice.tax_total ? (
                <div className="flex justify-between">
                  <span className="text-muted">Tax</span>
                  <span>{formatMoney(invoice.tax_total)}</span>
                </div>
              ) : null}
              {invoice.discount_total ? (
                <div className="flex justify-between">
                  <span className="text-muted">Discount</span>
                  <span>-{formatMoney(invoice.discount_total)}</span>
                </div>
              ) : null}
              {invoice.prior_billed_total ? (
                <div className="flex justify-between">
                  <span className="text-muted">Less deposit already billed</span>
                  <span>-{formatMoney(invoice.prior_billed_total)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-semibold">
                <span>Invoice total</span>
                <span>{formatMoney(invoice.grand_total)}</span>
              </div>
            </div>
          </SectionCard>

          {(invoice.payments || []).length > 0 ? (
            <SectionCard title="Payments received">
              <div className="space-y-2">
                {invoice.payments.map((payment, index) => (
                  <ListRow
                    key={`${payment.received_at}-${index}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      {formatDay(payment.received_at)} · {paymentMethodLabel(payment.method)}
                    </div>
                    <div className="font-semibold">{formatMoney(payment.amount)}</div>
                  </ListRow>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {invoice.notes ? (
            <SectionCard title="Notes">
              <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </PublicFrame>
  );
}
