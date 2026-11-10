"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput } from "@/components/ui/formatted-inputs";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirmModal } from "@/components/modals/confirm-modal";

const METHODS = [
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "ach", label: "ACH" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  const text = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${text}` : `$${text}`;
}

function methodLabel(method) {
  return METHODS.find((item) => item.value === method)?.label || "Payment";
}

const emptyForm = {
  amount: "",
  method: "check",
  reference: "",
  received_at: "",
  note: "",
  invoice_id: "",
};

export function JobMoney({ jobId, onChanged }) {
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();
  const [money, setMoney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api(`/jobs/${jobId}/money`);
      setMoney(res.money);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load money");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (jobId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function refresh() {
    await load();
    onChanged?.();
  }

  const openInvoices = (money?.invoices || []).filter(
    (invoice) => invoice.status !== "Draft" && invoice.balance_due > 0,
  );

  async function recordPayment(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/jobs/${jobId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          method: form.method,
          reference: form.reference || null,
          note: form.note || null,
          received_at: form.received_at || null,
          invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
        }),
      });
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err?.message || "Failed to record payment");
    } finally {
      setBusy(false);
    }
  }

  async function applyPayment(paymentId, invoiceId) {
    if (!invoiceId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api(`/jobs/${jobId}/payments/${paymentId}/apply`, {
        method: "POST",
        body: JSON.stringify({ invoice_id: Number(invoiceId) }),
      });
      setMoney(res.money);
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Failed to apply payment");
    } finally {
      setBusy(false);
    }
  }

  function removePayment(payment) {
    askConfirm({
      title: "Remove this payment?",
      description: `${formatMoney(payment.amount)} will come off the job. The invoice balance updates with it.`,
      confirmLabel: "Remove payment",
      tone: "danger",
      onConfirm: async () => {
        await api(`/jobs/${jobId}/payments/${payment.id}`, { method: "DELETE" });
        await refresh();
      },
    });
  }

  async function createChangeOrder() {
    setBusy(true);
    setError("");
    try {
      const res = await api(`/jobs/${jobId}/change-orders`, {
        method: "POST",
        body: JSON.stringify({ title: "Change order" }),
      });
      router.push(`/estimates/${res.estimate.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create change order");
      setBusy(false);
    }
  }

  const credit = money && money.still_owed < 0;

  return (
    <SectionCard
      id="section-money"
      size="lg"
      title="Money"
      description="The accepted price, what has been collected, and what is still owed."
      right={
        money?.has_contract ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={createChangeOrder}
          >
            New change order
          </button>
        ) : null
      }
    >
      {loading && !money ? <p className="text-sm text-muted">Loading money…</p> : null}
      {error ? <Alert variant="inline">{error}</Alert> : null}

      {money && !money.has_contract ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted">
          No accepted contract yet. Approving an estimate sets the price for this
          job. Deposits can be recorded after that.
        </div>
      ) : null}

      {money?.has_contract ? (
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              size="compact"
              label="Contract"
              value={<span data-money="contract">{formatMoney(money.contract_total)}</span>}
              sub={money.contract?.title || "Accepted scope"}
            />
            <StatCard
              size="compact"
              label="Collected"
              value={<span data-money="collected">{formatMoney(money.collected)}</span>}
              sub="Deposits and invoice payments"
            />
            <StatCard
              size="compact"
              label={credit ? "Credit" : "Still owed"}
              value={
                <span data-money="still-owed">
                  {formatMoney(credit ? Math.abs(money.still_owed) : money.still_owed)}
                </span>
              }
              sub={credit ? "Collected is ahead of the contract" : "Left on the contract"}
            />
            <StatCard
              size="compact"
              label="Unbilled"
              value={<span data-money="unbilled">{formatMoney(money.unbilled)}</span>}
              sub={
                money.unbilled < 0
                  ? "Invoiced ahead of the contract"
                  : "Contract not yet on an invoice"
              }
            />
          </div>

          {money.change_orders.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Change orders</div>
              {money.change_orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/estimates/${order.id}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{order.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatMoney(order.grand_total)}</span>
                    <StatusBadge kind="estimate" status={order.status} />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <form onSubmit={recordPayment} className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount" required>
              <CurrencyInput
                cents
                value={form.amount}
                onChange={(amount) => setForm((prev) => ({ ...prev, amount }))}
                placeholder="$0.00"
              />
            </Field>
            <Field label="Method">
              <select
                className="input"
                value={form.method}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, method: event.target.value }))
                }
              >
                {METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reference">
              <input
                className="input"
                value={form.reference}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reference: event.target.value }))
                }
                placeholder="Check number"
              />
            </Field>
            <Field label="Received">
              <input
                className="input"
                type="date"
                value={form.received_at}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, received_at: event.target.value }))
                }
              />
            </Field>
            <Field label="Apply to invoice" className="sm:col-span-2">
              <select
                className="input"
                value={form.invoice_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, invoice_id: event.target.value }))
                }
              >
                <option value="">Deposit on the job</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} · {formatMoney(invoice.balance_due)} open
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note" className="sm:col-span-2">
              <input
                className="input"
                value={form.note}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
                placeholder="Optional, stays on the job"
              />
            </Field>
            <FormActions className="sm:col-span-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? "Saving…" : "Record payment"}
              </button>
            </FormActions>
          </form>

          {money.payments.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Payments</div>
              {money.payments.map((payment) => {
                const invoice = money.invoices.find((row) => row.id === payment.invoice_id);
                return (
                  <div
                    key={payment.id}
                    className="flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {methodLabel(payment.method)} · {formatMoney(payment.amount)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {formatDate(payment.received_at)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                        {invoice ? ` · ${invoice.invoice_number}` : " · Deposit"}
                      </div>
                      {payment.note ? (
                        <div className="mt-1 text-sm text-muted">{payment.note}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.invoice_id == null && openInvoices.length > 0 ? (
                        <ApplyDeposit
                          paymentId={payment.id}
                          invoices={openInvoices}
                          disabled={busy}
                          onApply={applyPayment}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => removePayment(payment)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          )}
        </div>
      ) : null}
      {confirmModal}
    </SectionCard>
  );
}

function ApplyDeposit({ paymentId, invoices, disabled, onApply }) {
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ? String(invoices[0].id) : "");

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(paymentId, invoiceId);
      }}
    >
      <select
        className="input"
        aria-label="Invoice to apply this deposit to"
        value={invoiceId}
        onChange={(event) => setInvoiceId(event.target.value)}
      >
        {invoices.map((invoice) => (
          <option key={invoice.id} value={invoice.id}>
            {invoice.invoice_number}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-sm" disabled={disabled || !invoiceId}>
        Apply
      </button>
    </form>
  );
}
