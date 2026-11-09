"use client";

import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import { Alert } from "@/components/ui/alert";
import { PeekLink } from "@/components/peek/peek-provider";
import { StatusPill } from "@/components/records/record-bits";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/helper";
import { INVOICE_KIND_LABEL, formatMoney } from "@/lib/job-lifecycle";

function Figure({ label, value, tone, testId }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <div className="kv-label">{label}</div>
      <div
        className={cx(
          "num mt-0.5 truncate text-lg font-semibold tracking-tight",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function billingNote(estimate, invoices) {
  if (estimate.status !== "Approved") return null;
  const live = invoices.filter(
    (inv) => String(inv.estimate_id) === String(estimate.id) && inv.status !== "Void",
  );
  const deposit = live.find((inv) => inv.kind === "deposit");
  const final = live.find((inv) => inv.kind !== "deposit");
  if (final) return `Billed on ${final.invoice_number}`;
  if (deposit) return `Deposit on ${deposit.invoice_number} · rest not billed`;
  return "Not billed yet";
}

/**
 * The job's money in one place: what was agreed, billed, collected and still
 * owed, and the documents behind those numbers. Each document opens beside
 * the job; billing happens on the document or from the job's next step.
 */
export function JobMoneyCard({ job, estimates = [], invoices = [], loading = false, error = "" }) {
  const money = job?.money || {};
  const sortedEstimates = [...estimates].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  return (
    <section id="section-money" className="panel" data-testid="job-money">
      <div className="panel-head">
        <h2 className="panel-title">Money</h2>
        <span className="text-xs text-muted">Agreed, billed, collected, still owed</span>
      </div>
      <div className="panel-body space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure label="Contract" value={formatMoney(money.contract_total)} testId="money-contract" />
          <Figure label="Invoiced" value={formatMoney(money.invoiced_total)} />
          <Figure
            label="Collected"
            value={formatMoney(money.collected_total)}
            tone={money.collected_total > 0 ? "success" : undefined}
          />
          <Figure
            label="Balance due"
            value={formatMoney(money.outstanding_total)}
            tone={money.overdue_total > 0 ? "danger" : money.outstanding_total > 0 ? "warning" : undefined}
            testId="money-balance"
          />
        </div>

        {money.unbilled_total > 0 ? (
          <Alert tone="warning">
            {formatMoney(money.unbilled_total)} of approved work has not been invoiced yet.
          </Alert>
        ) : null}

        {error ? <Alert variant="inline">{error}</Alert> : null}

        <div className="doc-section" data-testid="job-estimates">
          <div className="eyebrow">Estimates</div>
          {loading ? (
            <SectionSkeleton rows={2} />
          ) : sortedEstimates.length === 0 ? (
            <p className="px-1 text-sm text-muted">
              No estimates yet. Start one from the next step, or Create → Estimate for this job.
            </p>
          ) : (
            <ul className="doc-lines">
              {sortedEstimates.map((estimate) => {
                const note = billingNote(estimate, invoices);
                return (
                  <li key={estimate.id}>
                    <PeekLink kind="estimate" id={estimate.id} className="doc-line">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{estimate.title}</div>
                        <div className="doc-line-sub">
                          {estimate.change_order_of ? "Change order · " : ""}
                          {note || formatDate(estimate.updated_at || estimate.created_at)}
                        </div>
                      </div>
                      <StatusPill kind="estimate" status={estimate.status} />
                      <div className="num shrink-0 font-semibold">{formatMoney(estimate.grand_total)}</div>
                    </PeekLink>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="doc-section" data-testid="job-invoices">
          <div className="eyebrow">Invoices</div>
          {loading ? (
            <SectionSkeleton rows={2} />
          ) : sortedInvoices.length === 0 ? (
            <p className="px-1 text-sm text-muted">No invoices yet. They are billed from an approved estimate.</p>
          ) : (
            <ul className="doc-lines">
              {sortedInvoices.map((inv) => (
                <li key={inv.id}>
                  <PeekLink kind="invoice" id={inv.id} className="doc-line">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {inv.invoice_number}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {INVOICE_KIND_LABEL[inv.kind] || "Invoice"}
                        </span>
                      </div>
                      <div className="doc-line-sub">
                        {inv.status === "Draft"
                          ? "Not sent"
                          : `${formatDate(inv.sent_at || inv.created_at)}${inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ""}`}
                        {inv.balance_due > 0 && !["Draft", "Void"].includes(inv.status)
                          ? ` · ${formatMoney(inv.balance_due)} due`
                          : ""}
                      </div>
                    </div>
                    <StatusPill kind="invoice" status={inv.status} />
                    <div className="num shrink-0 font-semibold">{formatMoney(inv.grand_total)}</div>
                  </PeekLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
