"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput } from "@/components/ui/formatted-inputs";
import { Alert } from "@/components/ui/alert";
import { ListRow } from "@/components/ui/list-row";
import { formatDate } from "@/lib/helper";
import {
  PAYMENT_METHODS,
  formatMoney,
  paymentMethodLabel,
} from "@/lib/job-lifecycle";

function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * The ledger for one invoice. Recording a payment is the only way an invoice
 * becomes Partially Paid or Paid; the server derives the status.
 */
export function InvoicePayments({
  invoice,
  canRemove = false,
  busy = false,
  error = "",
  notice = "",
  onRecord,
  onRemove,
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    amount: invoice.balance_due,
    method: "check",
    reference: "",
    received_at: todayInput(),
    notes: "",
  }));

  const isVoid = invoice.status === "Void";
  const settled = invoice.balance_due <= 0 && invoice.status !== "Draft";
  const payments = invoice.payments || [];

  function openForm() {
    setForm({
      amount: invoice.balance_due,
      method: "check",
      reference: "",
      received_at: todayInput(),
      notes: "",
    });
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    const ok = await onRecord({
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
      // Noon local time keeps the chosen calendar day in every timezone.
      received_at: form.received_at ? new Date(`${form.received_at}T12:00:00`).toISOString() : null,
    });
    if (ok) setOpen(false);
  }

  return (
    <SectionCard
      id="payments"
      size="lg"
      title="Payments"
      description={
        isVoid
          ? "This invoice is void."
          : settled
            ? "Paid in full."
            : `${formatMoney(invoice.balance_due)} still due`
      }
      right={
        !isVoid && !settled ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => (open ? setOpen(false) : openForm())}
          >
            {open ? "Hide" : "Record payment"}
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}

        {open ? (
          <form onSubmit={submit} className="list-row list-row-muted space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount" required>
                <CurrencyInput
                  cents
                  value={form.amount}
                  onChange={(value) => setForm((f) => ({ ...f, amount: value }))}
                  aria-label="Payment amount"
                />
              </Field>
              <Field label="Method">
                <select
                  className="input"
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Received">
                <input
                  type="date"
                  className="input"
                  value={form.received_at}
                  onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reference">
                <input
                  className="input"
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Check # or transaction id"
                />
              </Field>
              <Field label="Internal note">
                <input
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Not shown to the client"
                />
              </Field>
            </div>
            <FormActions>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={busy || !(Number(form.amount) > 0)}
              >
                {busy ? "Saving…" : "Save payment"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setForm((f) => ({ ...f, amount: invoice.balance_due }))}
              >
                Full balance
              </button>
            </FormActions>
          </form>
        ) : null}

        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
            No payments recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <ListRow key={payment.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {formatMoney(payment.amount)}{" "}
                    <span className="text-sm font-normal text-muted">
                      by {paymentMethodLabel(payment.method).toLowerCase()}
                      {payment.reference ? ` #${payment.reference}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDate(payment.received_at)}
                    {payment.recorded_by?.name ? ` · recorded by ${payment.recorded_by.name}` : ""}
                  </div>
                  {payment.notes ? (
                    <div className="mt-1 text-xs text-muted">{payment.notes}</div>
                  ) : null}
                </div>
                {canRemove ? (
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    disabled={busy}
                    onClick={() => onRemove(payment)}
                  >
                    Remove
                  </button>
                ) : null}
              </ListRow>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
