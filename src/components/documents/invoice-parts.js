"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { API_BASE, formatDate } from "@/lib/helper";
import { cx } from "@/lib/cx";
import { announceChange } from "@/lib/record-events";
import { invoiceNextStep } from "@/lib/documents";
import { PAYMENT_METHODS, formatMoney, paymentMethodLabel } from "@/lib/job-lifecycle";
import {
  buildInvoiceReminderMessage,
  copyText,
  dueDateLabel,
  firstNameFromLeadName,
  formatMessageAmount,
  logOutboundEmailOnJob,
} from "@/lib/message-templates";
import { useToast } from "@/components/toast/toast-provider";
import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput } from "@/components/ui/formatted-inputs";
import { Alert } from "@/components/ui/alert";
import { Eyebrow } from "@/components/records/record-bits";
import { Icon } from "@/components/icons";
import { HelpLink } from "@/components/help/help-provider";
import { INVOICE_STEP_ARTICLE } from "@/lib/help";

async function tryCopy(text) {
  try {
    return await copyText(text);
  } catch {
    return false;
  }
}

async function downloadBlob(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Every action an invoice offers, in one place. Each one tells the rest of
 * the screen what changed (the job's money and next step follow the ledger),
 * and failures carry the reason the server gave.
 */
export function useInvoiceActions(invoice, onUpdated) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  function changed(next) {
    if (next) onUpdated?.(next);
    announceChange({ kind: "invoice", id: invoice.id, jobId: invoice.job_id });
  }

  async function run(key, fn) {
    setBusy(key);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e?.message || "That did not work. Try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    error,
    clearError: () => setError(""),

    markSent: () =>
      run("send", async () => {
        const res = await api(`/invoices/${invoice.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Sent" }),
        });
        changed(res.invoice);
        showToast(`${res.invoice.invoice_number} is sent. It now counts toward what the client owes.`, {
          tone: "success",
        });
        return res.invoice;
      }),

    copyLink: () =>
      run("link", async () => {
        const res = await api(`/invoices/${invoice.id}/share`, { method: "POST" });
        const copied = await tryCopy(res.share_url);
        changed(res.invoice);
        // Each copy mints a new link (only its hash is stored), so an earlier one stops working.
        const fresh = invoice.share_expires_at ? " Any earlier link no longer works." : "";
        showToast(
          copied ? `Invoice link copied.${fresh}` : `Copy the client's link: ${res.share_url}`,
          { tone: "success" },
        );
        return res.invoice;
      }),

    copyMessage: () =>
      run("message", async () => {
        const res = await api(`/invoices/${invoice.id}/share`, { method: "POST" });
        const data = res.invoice || invoice;
        const message = buildInvoiceReminderMessage({
          first_name: firstNameFromLeadName(data?.job?.lead_name),
          job_title: data?.job?.title || "your job",
          // What the client owes today, not the original total.
          amount: formatMessageAmount(data?.balance_due ?? data?.grand_total),
          due_date: dueDateLabel(data?.due_date) || "on receipt",
          link: res.share_url,
        });
        const copied = await tryCopy(message);
        let logged = true;
        try {
          await logOutboundEmailOnJob(data.job_id, message);
        } catch {
          logged = false;
        }
        changed(res.invoice);
        showToast(
          copied && logged
            ? "Message copied and logged on the job."
            : copied
              ? "Message copied. It could not be logged on the job."
              : "Message logged on the job — copy it from the conversation.",
          { tone: copied || logged ? "success" : "danger" },
        );
        return res.invoice;
      }),

    recordPayment: (body) =>
      run("pay", async () => {
        const res = await api(`/invoices/${invoice.id}/payments`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        changed(res.invoice);
        announceChange({ kind: "job", id: res.invoice.job_id });
        const closed = res.job?.status === "Closed";
        showToast(
          closed
            ? "Paid in full. The job is settled and closed."
            : res.invoice?.status === "Paid"
              ? `${res.invoice.invoice_number} is paid in full.`
              : `Payment saved. ${formatMoney(res.invoice?.balance_due)} still due.`,
          // Closing the job is the end of the loop: leave time to read it.
          { tone: "success", duration: closed ? 8000 : undefined },
        );
        return res.invoice;
      }),

    removePayment: (payment) =>
      run("remove", async () => {
        const res = await api(`/invoices/${invoice.id}/payments/${payment.id}`, {
          method: "DELETE",
        });
        changed(res.invoice);
        announceChange({ kind: "job", id: res.invoice.job_id });
        showToast(`Removed the ${formatMoney(payment.amount)} payment.`);
        return res.invoice;
      }),

    voidInvoice: () =>
      run("void", async () => {
        const res = await api(`/invoices/${invoice.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Void" }),
        });
        changed(res.invoice);
        showToast(`${res.invoice.invoice_number} is void. It no longer counts toward what the client owes.`);
        return res.invoice;
      }),

    deleteInvoice: () =>
      run("delete", async () => {
        await api(`/invoices/${invoice.id}`, { method: "DELETE" });
        announceChange({ kind: "invoice", id: invoice.id, jobId: invoice.job_id, deleted: true });
        showToast(`${invoice.invoice_number} deleted.`);
        return true;
      }),

    downloadPdf: () =>
      run("pdf", async () => {
        await downloadBlob(`/invoices/${invoice.id}/pdf`, `${invoice.invoice_number || `invoice-${invoice.id}`}.pdf`);
        return true;
      }),

    syncQuickBooks: () =>
      run("qb", async () => {
        const res = await api(`/integrations/quickbooks/sync-invoice/${invoice.id}`, { method: "POST" });
        showToast(`Synced to QuickBooks (${res.sync?.qb_doc_number || "done"}).`, { tone: "success" });
        return true;
      }),
  };
}

function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Record one payment. The server derives the invoice status from the ledger. */
export function PaymentForm({ invoice, busy = false, onSubmit, onCancel, compact = false }) {
  const [form, setForm] = useState(() => ({
    amount: invoice.balance_due,
    method: "check",
    reference: "",
    received_at: todayInput(),
    notes: "",
  }));

  async function submit(event) {
    event.preventDefault();
    await onSubmit({
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
      // Noon local time keeps the chosen calendar day in every timezone.
      received_at: form.received_at ? new Date(`${form.received_at}T12:00:00`).toISOString() : null,
    });
  }

  return (
    <form onSubmit={submit} className="doc-form" data-testid="payment-form">
      <div className={cx("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-3")}>
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
        <Field label="Received" className={compact ? "col-span-2" : ""}>
          <input
            type="date"
            className="input"
            value={form.received_at}
            onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))}
          />
        </Field>
      </div>
      <div className={cx("grid gap-3", compact ? "" : "sm:grid-cols-2")}>
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
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !(Number(form.amount) > 0)}>
          {busy ? "Saving…" : "Save payment"}
        </button>
        {Number(form.amount) !== Number(invoice.balance_due) ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setForm((f) => ({ ...f, amount: invoice.balance_due }))}
          >
            Full balance
          </button>
        ) : null}
        {onCancel ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </FormActions>
    </form>
  );
}

/**
 * The one thing to do with this invoice now, with the control that does it.
 * Used in the record head and in the peek.
 */
export function InvoiceNextStep({ invoice, actions, startPaying = false, payRequest = null, compact = false }) {
  const [paying, setPaying] = useState(startPaying || payRequest != null);
  // Each new request (Record payment on the job while this is already open)
  // opens the form again, not only the one that mounted it.
  const [seenRequest, setSeenRequest] = useState(payRequest);
  if (payRequest != null && payRequest !== seenRequest) {
    setSeenRequest(payRequest);
    setPaying(true);
  }
  const step = invoiceNextStep(invoice);
  if (!step) return null;

  const isDone = step.action === "none";
  return (
    <div
      className={cx("next-step", !compact && "next-step-row", isDone && "next-step-quiet")}
      data-testid="invoice-next-step"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Eyebrow>{isDone ? "Status" : "Next step"}</Eyebrow>
          <HelpLink article={INVOICE_STEP_ARTICLE[step.action]} />
        </div>
        <div className={cx("font-medium", step.tone === "danger" && "text-danger")}>{step.label}</div>
        {step.detail ? <div className="text-sm text-muted">{step.detail}</div> : null}
      </div>
      {step.action === "send_invoice" ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!!actions.busy}
            onClick={actions.markSent}
          >
            {actions.busy === "send" ? "Sending…" : "Mark sent"}
          </button>
          <button type="button" className="btn btn-sm" disabled={!!actions.busy} onClick={actions.copyLink}>
            <Icon name="link" className="h-3.5 w-3.5" />
            {actions.busy === "link" ? "Copying…" : "Copy link"}
          </button>
        </div>
      ) : null}
      {step.action === "record_payment" && !paying ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!!actions.busy}
            onClick={() => {
              actions.clearError();
              setPaying(true);
            }}
          >
            <Icon name="dollar" className="h-3.5 w-3.5" />
            Record payment
          </button>
        </div>
      ) : null}
      {actions.error ? (
        <Alert className="w-full">{actions.error}</Alert>
      ) : null}
      {step.action === "record_payment" && paying ? (
        <div className="w-full">
          <PaymentForm
            invoice={invoice}
            compact={compact}
            busy={actions.busy === "pay"}
            onCancel={() => {
              actions.clearError();
              setPaying(false);
            }}
            onSubmit={async (body) => {
              const next = await actions.recordPayment(body);
              if (next) setPaying(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PaymentLines({ invoice, canRemove = false, onRemove, busy = false }) {
  const payments = invoice.payments || [];
  if (payments.length === 0) {
    return <p className="px-1 text-sm text-muted">No payments recorded yet.</p>;
  }
  return (
    <ul className="doc-lines" data-testid="payment-lines">
      {payments.map((payment) => (
        <li key={payment.id} className="doc-line">
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {paymentMethodLabel(payment.method)}
              {payment.reference ? <span className="text-muted"> #{payment.reference}</span> : null}
            </div>
            <div className="text-xs text-muted">
              {formatDate(payment.received_at)}
              {payment.recorded_by?.name ? ` · recorded by ${payment.recorded_by.name}` : ""}
              {payment.notes ? ` · ${payment.notes}` : ""}
            </div>
          </div>
          <div className="num shrink-0 font-semibold">{formatMoney(payment.amount)}</div>
          {canRemove ? (
            <button
              type="button"
              className="link shrink-0 text-xs"
              disabled={busy}
              onClick={() => onRemove(payment)}
              aria-label={`Remove the ${formatMoney(payment.amount)} payment`}
            >
              Remove
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Subtotal down to balance due, the same order the PDF and the client see. */
export function InvoiceTotals({ invoice }) {
  const rows = [
    { label: "Subtotal", value: formatMoney(invoice.subtotal) },
    invoice.tax_total ? { label: "Tax", value: formatMoney(invoice.tax_total) } : null,
    invoice.discount_total ? { label: "Discounts", value: `−${formatMoney(invoice.discount_total)}` } : null,
    invoice.prior_billed_total
      ? { label: "Less deposit billed", value: `−${formatMoney(invoice.prior_billed_total)}` }
      : null,
    { label: "Invoice total", value: formatMoney(invoice.grand_total), strong: true },
    invoice.amount_paid ? { label: "Paid", value: `−${formatMoney(invoice.amount_paid)}` } : null,
    { label: "Balance due", value: formatMoney(invoice.balance_due), strong: true, testId: "invoice-balance" },
  ].filter(Boolean);
  return (
    <dl className="totals">
      {rows.map((row) => (
        <div key={row.label} className={cx("totals-row", row.strong && "totals-row-strong")}>
          <dt>{row.label}</dt>
          <dd className="num" data-testid={row.testId}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
