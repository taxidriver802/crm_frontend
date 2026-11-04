"use client";

import { useState } from "react";
import Link from "next/link";
import { ReturnLink } from "@/components/return-to";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import { NumberInput } from "@/components/ui/formatted-inputs";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/helper";
import { INVOICE_KIND_LABEL, formatMoney } from "@/lib/job-lifecycle";

function Figure({ label, value, tone, testId }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <div className="kv-label">{label}</div>
      <div
        className={cx(
          "mt-0.5 truncate text-lg font-semibold tracking-tight",
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

function billingStateFor(estimate, invoices) {
  const live = invoices.filter(
    (inv) => inv.estimate_id === estimate.id && inv.status !== "Void",
  );
  const deposit = live.find((inv) => inv.kind === "deposit") || null;
  const final = live.find((inv) => inv.kind !== "deposit") || null;
  return { deposit, final };
}

/**
 * The job's money in one place: what was agreed, what was billed, what came
 * in, and what is still owed — plus the billing actions that move it.
 */
export function JobMoneyCard({
  job,
  estimates = [],
  invoices = [],
  loading = false,
  error = "",
  busyKey = null,
  actionError = "",
  onBill,
}) {
  const [depositFor, setDepositFor] = useState(null);
  const [depositPercent, setDepositPercent] = useState("30");
  const money = job?.money || {};
  const approved = estimates.filter((estimate) => estimate.status === "Approved");
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  return (
    <SectionCard
      id="section-money"
      size="lg"
      title="Money"
      description="Agreed, billed, collected, and still owed on this job"
      right={
        <Link href={`/invoices/new?job_id=${job.id}`} className="btn btn-sm">
          New invoice
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label="Contract"
            value={formatMoney(money.contract_total)}
            testId="money-contract"
          />
          <Figure label="Invoiced" value={formatMoney(money.invoiced_total)} />
          <Figure
            label="Collected"
            value={formatMoney(money.collected_total)}
            tone={money.collected_total > 0 ? "success" : undefined}
          />
          <Figure
            label="Balance due"
            value={formatMoney(money.outstanding_total)}
            tone={
              money.overdue_total > 0
                ? "danger"
                : money.outstanding_total > 0
                  ? "warning"
                  : undefined
            }
            testId="money-balance"
          />
        </div>

        {money.unbilled_total > 0 ? (
          <Alert tone="warning">
            {formatMoney(money.unbilled_total)} of approved work has not been invoiced yet.
          </Alert>
        ) : null}

        {actionError ? <Alert>{actionError}</Alert> : null}

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Approved scope
          </div>
          {approved.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
              No approved estimate yet. The contract value appears when the client
              approves.
            </div>
          ) : (
            approved.map((estimate) => {
              const { deposit, final } = billingStateFor(estimate, invoices);
              const showDepositForm = depositFor === estimate.id;
              return (
                <div key={estimate.id} className="list-row space-y-3">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <ReturnLink
                        href={`/estimates/${estimate.id}`}
                        className="font-medium underline underline-offset-4 hover:opacity-80"
                      >
                        {estimate.title}
                      </ReturnLink>
                      <div className="mt-1 text-xs text-muted">
                        {estimate.change_order_of ? "Change order · " : ""}
                        {formatMoney(estimate.grand_total)}
                        {deposit ? ` · deposit ${deposit.invoice_number}` : ""}
                        {final ? ` · billed on ${final.invoice_number}` : ""}
                      </div>
                    </div>
                    {final ? (
                      <StatusBadge tone="success">Billed</StatusBadge>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {!deposit ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={!!busyKey}
                            onClick={() =>
                              setDepositFor((current) =>
                                current === estimate.id ? null : estimate.id,
                              )
                            }
                          >
                            Request deposit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!!busyKey}
                          onClick={() => onBill(estimate.id, { kind: "final" })}
                        >
                          {busyKey === `final-${estimate.id}`
                            ? "Creating…"
                            : deposit
                              ? "Final invoice (less deposit)"
                              : "Final invoice"}
                        </button>
                      </div>
                    )}
                  </div>

                  {showDepositForm ? (
                    <form
                      className="flex flex-wrap items-end gap-2 border-t border-base pt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onBill(estimate.id, {
                          kind: "deposit",
                          deposit_percent: Number(depositPercent),
                        });
                        setDepositFor(null);
                      }}
                    >
                      <label className="block text-xs text-muted">
                        Deposit %
                        <NumberInput
                          className="input mt-1 w-24"
                          allowDecimal
                          value={depositPercent}
                          onChange={(value) => setDepositPercent(String(value))}
                        />
                      </label>
                      <div className="pb-2 text-sm text-muted">
                        ={" "}
                        {formatMoney(
                          (Number(estimate.grand_total || 0) * Number(depositPercent || 0)) /
                            100,
                        )}
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={!!busyKey || !(Number(depositPercent) > 0)}
                      >
                        {busyKey === `deposit-${estimate.id}` ? "Creating…" : "Create deposit invoice"}
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Invoices
          </div>
          {loading ? (
            <SectionSkeleton rows={2} />
          ) : error ? (
            <Alert variant="inline">{error}</Alert>
          ) : sortedInvoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
              No invoices for this job yet.
            </div>
          ) : (
            sortedInvoices.map((inv) => (
              <ReturnLink
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex min-w-0 items-start justify-between gap-3 rounded-lg border p-4 transition hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {inv.invoice_number}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {INVOICE_KIND_LABEL[inv.kind] || "Invoice"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{formatDate(inv.sent_at || inv.created_at)}</span>
                    {inv.due_date ? (
                      <>
                        <span>•</span>
                        <span>Due {formatDate(inv.due_date)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge kind="invoice" status={inv.status} />
                  <div className="text-sm font-semibold">{formatMoney(inv.grand_total)}</div>
                  {inv.balance_due > 0 && inv.status !== "Draft" ? (
                    <div className="text-xs text-muted">{formatMoney(inv.balance_due)} due</div>
                  ) : null}
                </div>
              </ReturnLink>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}
