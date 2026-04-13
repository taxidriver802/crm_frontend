"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ToggleFormSection } from "@/components/toggle-form-section";
import { DetailSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import Link from "next/link";
import { API_BASE, formatDate } from "@/lib/helper";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"];

function StatusBadge({ status }) {
  const map = {
    Draft: "border-gray-500/30 bg-gray-500/10 text-gray-700",
    Sent: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    Paid: "border-green-500/30 bg-green-500/10 text-green-700",
    Overdue: "border-red-500/30 bg-red-500/10 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${map[status] || ""}`}
    >
      {status}
    </span>
  );
}

function InvoiceLineItemForm({
  form,
  onChange,
  onSubmit,
  saving,
  onCancel,
  submitLabel,
  deleteButton,
  onDelete,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted text-xs">Name</span>
          <input
            className="input mt-1 w-full"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Line item name"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted text-xs">Description</span>
          <input
            className="input mt-1 w-full"
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted text-xs">Quantity</span>
          <input
            type="number"
            className="input mt-1 w-full"
            value={form.quantity}
            onChange={(e) => onChange({ ...form, quantity: e.target.value })}
            min="0"
            step="any"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted text-xs">Unit Price</span>
          <input
            type="number"
            className="input mt-1 w-full"
            value={form.unit_price}
            onChange={(e) => onChange({ ...form, unit_price: e.target.value })}
            min="0"
            step="any"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn px-3 py-2 text-xs" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {deleteButton ? (
          <button
            type="button"
            className="btn px-3 py-2 text-xs text-red-600"
            onClick={onDelete}
            disabled={saving}
          >
            Delete
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function createEmptyLineItem() {
  return { name: "", description: "", quantity: 1, unit_price: 0 };
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [qbBusy, setQbBusy] = useState(false);
  const [qbHint, setQbHint] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [lineItemForm, setLineItemForm] = useState(createEmptyLineItem());
  const [savingItem, setSavingItem] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);

  const lineItems = invoice?.line_items || [];

  async function loadInvoice() {
    const res = await api(`/invoices/${id}`);
    setInvoice(res?.invoice ?? res);
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError("");
      await loadInvoice();
    } catch (e) {
      setError(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  async function downloadPdf() {
    setPdfBusy(true);
    setShareHint("");
    try {
      const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Could not download PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  async function createShareLink() {
    setShareBusy(true);
    setShareHint("");
    try {
      const res = await api(`/invoices/${id}/share`, { method: "POST" });
      const url = res.share_url;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareHint("Share link copied to clipboard.");
      } else {
        setShareHint(url);
      }
      if (res.invoice) setInvoice(res.invoice);
    } catch (e) {
      setError(e?.message || "Could not create share link");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleSyncToQB() {
    setQbBusy(true);
    setQbHint("");
    setError("");
    try {
      const res = await api(`/integrations/quickbooks/sync-invoice/${id}`, {
        method: "POST",
      });
      setQbHint(`Synced to QuickBooks (${res.sync?.qb_doc_number || "OK"})`);
    } catch (e) {
      setQbHint(e?.message || "Sync failed — is QuickBooks connected?");
    } finally {
      setQbBusy(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!invoice || newStatus === invoice.status) return;
    setStatusBusy(true);
    setError("");
    try {
      const res = await api(`/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setInvoice(res.invoice);
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDeleteInvoice() {
    const confirmed = window.confirm("Delete this invoice?");
    if (!confirmed) return;
    try {
      await api(`/invoices/${id}`, { method: "DELETE" });
      router.push(`/jobs/${invoice?.job_id}`);
    } catch (e) {
      setError(e?.message || "Failed to delete invoice");
    }
  }

  async function handleSubmitLineItem(e) {
    e.preventDefault();
    setSavingItem(true);
    try {
      const path = editingLineItem
        ? `/invoices/${id}/line-items/${editingLineItem.id}`
        : `/invoices/${id}/line-items`;
      const method = editingLineItem ? "PATCH" : "POST";
      const res = await api(path, {
        method,
        body: JSON.stringify(lineItemForm),
      });
      setInvoice(res.invoice);
      setLineItemForm(createEmptyLineItem());
      setEditingLineItem(null);
      setIsCreateOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to save line item");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteLineItem() {
    if (!editingLineItem) return;
    const confirmed = window.confirm("Delete this line item?");
    if (!confirmed) return;
    setSavingItem(true);
    try {
      await api(`/invoices/${id}/line-items/${editingLineItem.id}`, { method: "DELETE" });
      await loadInvoice();
      setLineItemForm(createEmptyLineItem());
      setEditingLineItem(null);
      setIsCreateOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to delete line item");
    } finally {
      setSavingItem(false);
    }
  }

  function handleEditLineItem(item) {
    if (isCreateOpen && editingLineItem?.id === item.id) {
      setIsCreateOpen(false);
      setEditingLineItem(null);
      setLineItemForm(createEmptyLineItem());
      return;
    }
    setLineItemForm({
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    setEditingLineItem(item);
    setIsCreateOpen(true);
    setError("");
  }

  const formatCurrency = (num) =>
    Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading && !invoice) {
    return (
      <AppShell title={`Invoice #${id}`}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title={invoice?.invoice_number || `Invoice #${id}`}>
      <div className="space-y-6">
        {error ? <PageError message={error} onRetry={loadPage} /> : null}

        <section className="card rounded-lg p-4">
          {!invoice ? (
            <div className="text-muted text-sm">Invoice not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold">{invoice.invoice_number}</div>
                  <Link
                    href={`/jobs/${invoice.job_id}`}
                    className="text-muted mt-1 cursor-pointer text-sm underline"
                  >
                    {invoice.job?.title ?? `Job #${invoice.job_id}`}
                  </Link>
                  {invoice.estimate_id ? (
                    <div className="text-muted mt-1 text-xs">
                      From{" "}
                      <Link
                        href={`/estimates/${invoice.estimate_id}`}
                        className="underline"
                      >
                        Estimate #{invoice.estimate_id}
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-3 py-1.5"
                    disabled={pdfBusy}
                    onClick={downloadPdf}
                  >
                    {pdfBusy ? "PDF…" : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-3 py-1.5"
                    disabled={shareBusy}
                    onClick={createShareLink}
                  >
                    {shareBusy ? "Link…" : "Copy share link"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-3 py-1.5"
                    disabled={qbBusy}
                    onClick={handleSyncToQB}
                  >
                    {qbBusy ? "Syncing…" : "Sync to QuickBooks"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-3 py-1.5 text-red-600"
                    onClick={handleDeleteInvoice}
                  >
                    Delete
                  </button>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>

              {shareHint ? <div className="text-muted text-sm">{shareHint}</div> : null}
              {qbHint ? <div className="text-muted text-sm">{qbHint}</div> : null}

              {invoice.share_expires_at ? (
                <div className="text-muted text-xs">
                  Share link active until{" "}
                  {new Date(invoice.share_expires_at).toLocaleString()}
                </div>
              ) : null}

              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-muted text-xs">Due date</div>
                  <div className="mt-1">
                    {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-xs">Paid at</div>
                  <div className="mt-1">
                    {invoice.paid_at ? formatDate(invoice.paid_at) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-xs">Client</div>
                  <div className="mt-1">{invoice.job?.lead_name || "—"}</div>
                </div>
              </div>

              {invoice.notes ? (
                <div>
                  <div className="text-muted text-xs">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</div>
                </div>
              ) : null}

              <div className="border-base border-t pt-4">
                <div className="text-muted mb-2 text-xs font-medium">Update status</div>
                <div className="flex flex-wrap gap-2">
                  {INVOICE_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={statusBusy || s === invoice.status}
                      onClick={() => handleStatusChange(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        s === invoice.status
                          ? "bg-accent-solid border-base text-white"
                          : "bg-surface border-base text-muted hover:opacity-80"
                      } ${statusBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <ToggleFormSection
          title={editingLineItem ? "Edit Line Item" : "Add Line Item"}
          description={
            editingLineItem ? "Update this line item." : "Add items to this invoice."
          }
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Item"
          closeLabel="Hide Form"
        >
          <InvoiceLineItemForm
            form={lineItemForm}
            onChange={setLineItemForm}
            onSubmit={handleSubmitLineItem}
            saving={savingItem}
            onCancel={() => {
              setLineItemForm(createEmptyLineItem());
              setEditingLineItem(null);
              setIsCreateOpen(false);
            }}
            submitLabel={editingLineItem ? "Update Item" : "Add Item"}
            deleteButton={!!editingLineItem}
            onDelete={handleDeleteLineItem}
          />
        </ToggleFormSection>

        <CollapsibleSection
          title="Line Items"
          description="Breakdown of charges."
          defaultOpen
        >
          {loading ? (
            <div className="text-muted text-sm">Loading items…</div>
          ) : lineItems.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No line items yet.
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-surface flex cursor-pointer items-start justify-between rounded-lg border p-3"
                  onClick={() => handleEditLineItem(item)}
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.description ? (
                      <div className="text-muted mt-1 text-sm">{item.description}</div>
                    ) : null}
                    <div className="text-muted mt-1 text-xs">
                      {Number(item.quantity).toLocaleString("en-US")} × $
                      {formatCurrency(item.unit_price)}
                    </div>
                  </div>
                  <div className="font-semibold">${formatCurrency(item.line_total)}</div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <section className="card rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>${formatCurrency(invoice?.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tax</span>
              <span>${formatCurrency(invoice?.tax_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Discounts</span>
              <span>-${formatCurrency(invoice?.discount_total)}</span>
            </div>
            <div className="border-base flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total Due</span>
              <span>${formatCurrency(invoice?.grand_total)}</span>
            </div>
          </div>
        </section>

        {invoice ? (
          <section className="card rounded-lg p-4">
            <div className="mb-3 font-medium">Invoice Timeline</div>
            <div className="relative space-y-0 pl-6">
              {[
                { label: "Created", date: invoice.created_at, done: true },
                {
                  label: "Sent",
                  date: invoice.status !== "Draft" ? invoice.updated_at : null,
                  done: invoice.status !== "Draft",
                },
                {
                  label: "Due",
                  date: invoice.due_date,
                  done: !!invoice.paid_at,
                  warn:
                    !invoice.paid_at &&
                    invoice.due_date &&
                    new Date(invoice.due_date) < new Date(),
                },
                { label: "Paid", date: invoice.paid_at, done: !!invoice.paid_at },
              ].map((step, i) => (
                <div
                  key={step.label}
                  className="relative flex items-start gap-3 pb-4 last:pb-0"
                >
                  <div
                    className={`absolute left-[-1.125rem] top-1 h-3 w-3 rounded-full border-2 ${
                      step.warn
                        ? "border-red-500 bg-red-500"
                        : step.done
                          ? "border-green-500 bg-green-500"
                          : "border-base bg-surface"
                    }`}
                  />
                  {i < 3 ? (
                    <div className="border-base absolute left-[-0.6875rem] top-4 h-full w-0 border-l" />
                  ) : null}
                  <div>
                    <div
                      className={`text-sm font-medium ${step.warn ? "text-red-600" : ""}`}
                    >
                      {step.label}
                      {step.warn ? " (overdue)" : ""}
                    </div>
                    <div className="text-muted text-xs">
                      {step.date ? formatDate(step.date) : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
