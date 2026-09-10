"use client";

import { ReturnLink } from "@/components/return-to";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  EntityList,
  EntityListMeta,
  EntityListMetaStrip,
  EntityListPrimary,
  EntityListRow,
} from "@/components/ui/entity-list";
import { formatDate } from "@/lib/helper";

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InvoiceRow({ invoice, onOpen, variant = "card" }) {
  return (
    <EntityListRow
      variant={variant}
      ariaLabel={`Invoice ${invoice.invoice_number}, status ${invoice.status}`}
      onOpen={() => onOpen(invoice.id)}
    >
      <EntityListPrimary
        title={invoice.invoice_number}
        subtitle={invoice.lead_name || null}
        badges={<StatusBadge kind="invoice" status={invoice.status} />}
      />

      <EntityListMetaStrip>
        <EntityListMeta label="Job">
          <ReturnLink
            href={`/jobs/${invoice.job_id}`}
            className="underline underline-offset-4 hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {invoice.job_title || `Job #${invoice.job_id}`}
          </ReturnLink>
        </EntityListMeta>

        <EntityListMeta label="Total">
          <span className="font-semibold">${formatCurrency(invoice.grand_total)}</span>
        </EntityListMeta>

        <EntityListMeta label="Due">
          {invoice.due_date ? formatDate(invoice.due_date) : "—"}
        </EntityListMeta>
      </EntityListMetaStrip>
    </EntityListRow>
  );
}

export function InvoicesList({
  invoices,
  loading,
  onOpen,
  layout = "stack",
  emptyDescription = "Try adjusting filters or create a new invoice.",
}) {
  const rowVariant = layout === "flush" ? "flush" : "card";

  return (
    <EntityList
      layout={layout}
      loading={loading}
      emptyTitle="No invoices found"
      emptyDescription={emptyDescription}
      skeletonRows={5}
    >
      {invoices.map((invoice) => (
        <InvoiceRow
          key={invoice.id}
          invoice={invoice}
          onOpen={onOpen}
          variant={rowVariant}
        />
      ))}
    </EntityList>
  );
}
