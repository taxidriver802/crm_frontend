"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReturnLink } from "@/components/return-to";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { DetailMoreMenu, DetailMoreMenuItem } from "@/components/detail-more-menu";
import { DetailSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import { API_BASE, formatDate } from "@/lib/helper";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, FormActions } from "@/components/ui/field";
import { DetailHeader } from "@/components/ui/detail-header";
import { SectionCard } from "@/components/ui/section-card";
import { MetaItem } from "@/components/ui/meta";
import { ListRow } from "@/components/ui/list-row";
import {
  buildInvoiceReminderMessage,
  copyText,
  dueDateLabel,
  firstNameFromLeadName,
  formatMessageAmount,
  logOutboundEmailOnJob,
} from "@/lib/message-templates";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"];

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
        <Field label="Name" required>
          <input
            className="input"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Line item name"
            required
          />
        </Field>
        <Field label="Description">
          <input
            className="input"
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quantity">
          <input
            type="number"
            className="input"
            value={form.quantity}
            onChange={(e) => onChange({ ...form, quantity: e.target.value })}
            min="0"
            step="any"
          />
        </Field>
        <Field label="Unit Price">
          <input
            type="number"
            className="input"
            value={form.unit_price}
            onChange={(e) => onChange({ ...form, unit_price: e.target.value })}
            min="0"
            step="any"
          />
        </Field>
      </div>
      <FormActions>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {deleteButton ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={onDelete}
            disabled={saving}
          >
            Delete
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </FormActions>
    </form>
  );
}

function createEmptyLineItem() {
  return { name: "", description: "", quantity: 1, unit_price: 0 };
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function copyMessage() {
    setMessageBusy(true);
    setShareHint("");
    setError("");
    try {
      const res = await api(`/invoices/${id}/share`, { method: "POST" });
      const url = res.share_url;
      if (!url) throw new Error("Could not create share link");
      if (res.invoice) setInvoice(res.invoice);
      const data = res.invoice || invoice;
      const message = buildInvoiceReminderMessage({
        first_name: firstNameFromLeadName(data?.job?.lead_name),
        job_title: data?.job?.title || "your job",
        amount: formatMessageAmount(data?.grand_total),
        due_date: dueDateLabel(data?.due_date),
        link: url,
      });
      const copied = await copyText(message);
      try {
        await logOutboundEmailOnJob(data.job_id, message);
        setShareHint(
          copied
            ? "Message copied and logged on the job."
            : "Message logged on the job. Copy it from the communication log.",
        );
      } catch {
        setShareHint(
          copied ? "Message copied. Could not log communication." : message,
        );
      }
    } catch (e) {
      setError(e?.message || "Could not copy message");
    } finally {
      setMessageBusy(false);
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

  function handleDeleteInvoice() {
    askConfirm({
      title: "Delete this invoice?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await api(`/invoices/${id}`, { method: "DELETE" });
          router.push(`/jobs/${invoice?.job_id}`);
        } catch (e) {
          setError(e?.message || "Failed to delete invoice");
        }
      },
    });
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

  function handleDeleteLineItem() {
    if (!editingLineItem) return;
    askConfirm({
      title: "Delete this line item?",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setSavingItem(true);
        try {
          await api(`/invoices/${id}/line-items/${editingLineItem.id}`, {
            method: "DELETE",
          });
          await loadInvoice();
          setLineItemForm(createEmptyLineItem());
          setEditingLineItem(null);
          setIsCreateOpen(false);
        } catch (e) {
          setError(e?.message || "Failed to delete line item");
        } finally {
          setSavingItem(false);
        }
      },
    });
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
    <AppShell
      title={invoice?.invoice_number || `Invoice #${id}`}
      description={invoice?.job?.title || invoice?.job?.lead_name || undefined}
    >
      <div className="space-y-6">
        {error ? <PageError message={error} onRetry={loadPage} /> : null}

        {!invoice ? (
          <section className="card p-4">
            <p className="text-muted text-sm">Invoice not found.</p>
          </section>
        ) : (
          <DetailHeader
            subtitle={
              <>
                <ReturnLink
                  href={`/jobs/${invoice.job_id}`}
                  className="underline underline-offset-4 hover:opacity-80"
                >
                  {invoice.job?.title ?? `Job #${invoice.job_id}`}
                </ReturnLink>
                {invoice.estimate_id ? (
                  <div className="mt-1 text-xs">
                    From{" "}
                    <ReturnLink
                      href={`/estimates/${invoice.estimate_id}`}
                      className="underline underline-offset-4 hover:opacity-80"
                    >
                      Estimate #{invoice.estimate_id}
                    </ReturnLink>
                  </div>
                ) : null}
              </>
            }
            badges={<StatusBadge kind="invoice" status={invoice.status} />}
            actions={
              <DetailMoreMenu label="More">
                <DetailMoreMenuItem
                  type="button"
                  disabled={pdfBusy}
                  onClick={downloadPdf}
                >
                  {pdfBusy ? "PDF…" : "Download PDF"}
                </DetailMoreMenuItem>
                <DetailMoreMenuItem
                  type="button"
                  disabled={shareBusy}
                  onClick={createShareLink}
                >
                  {shareBusy ? "Link…" : "Copy share link"}
                </DetailMoreMenuItem>
                <DetailMoreMenuItem
                  type="button"
                  disabled={messageBusy}
                  onClick={copyMessage}
                >
                  {messageBusy ? "Message…" : "Copy message"}
                </DetailMoreMenuItem>
                <DetailMoreMenuItem
                  type="button"
                  disabled={qbBusy}
                  onClick={handleSyncToQB}
                >
                  {qbBusy ? "Syncing…" : "Sync to QuickBooks"}
                </DetailMoreMenuItem>
                <DetailMoreMenuItem
                  type="button"
                  className="text-danger"
                  onClick={handleDeleteInvoice}
                >
                  Delete invoice
                </DetailMoreMenuItem>
              </DetailMoreMenu>
            }
          >
            {shareHint ? <div className="text-muted text-sm">{shareHint}</div> : null}
            {qbHint ? <div className="text-muted text-sm">{qbHint}</div> : null}

            {invoice.share_expires_at ? (
              <div className="text-muted text-xs">
                Share link active until {new Date(invoice.share_expires_at).toLocaleString()}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <MetaItem label="Due date">
                {invoice.due_date ? formatDate(invoice.due_date) : "—"}
              </MetaItem>
              <MetaItem label="Paid at">
                {invoice.paid_at ? formatDate(invoice.paid_at) : "—"}
              </MetaItem>
              <MetaItem label="Client">{invoice.job?.lead_name || "—"}</MetaItem>
            </div>

            {invoice.notes ? (
              <MetaItem label="Notes">
                <span className="whitespace-pre-wrap">{invoice.notes}</span>
              </MetaItem>
            ) : null}
          </DetailHeader>
        )}

        {invoice ? (
          <SectionCard
            size="lg"
            title="Status"
            description="Track where this invoice is in the workflow"
          >
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusBusy || s === invoice.status}
                  onClick={() => handleStatusChange(s)}
                  className={`choice-chip ${s === invoice.status ? "choice-chip-active" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          size="lg"
          title="Line items"
          description="Breakdown of charges"
          right={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (isCreateOpen && !editingLineItem) {
                  setIsCreateOpen(false);
                  return;
                }
                setEditingLineItem(null);
                setLineItemForm(createEmptyLineItem());
                setIsCreateOpen(true);
              }}
            >
              {isCreateOpen && !editingLineItem ? "Hide" : "New item"}
            </button>
          }
        >
          <div className="space-y-4">
            {isCreateOpen ? (
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
            ) : null}

            {loading ? (
              <div className="text-muted text-sm">Loading items…</div>
            ) : lineItems.length === 0 ? (
              <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
                No line items yet.
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <ListRow
                    key={item.id}
                    as="button"
                    type="button"
                    interactive
                    className="flex w-full items-start justify-between text-left"
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
                  </ListRow>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Totals">
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
        </SectionCard>

        {invoice ? (
          <CollapsibleSection
            id="section-timeline"
            title="Timeline"
            description="Created, sent, due, and paid"
            syncKey={id}
            ready
            empty={false}
          >
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
                        ? "border-danger bg-danger"
                        : step.done
                          ? "border-success bg-success"
                          : "border-base bg-surface"
                    }`}
                  />
                  {i < 3 ? (
                    <div className="border-base absolute left-[-0.6875rem] top-4 h-full w-0 border-l" />
                  ) : null}
                  <div>
                    <div
                      className={`text-sm font-medium ${step.warn ? "text-danger" : ""}`}
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
          </CollapsibleSection>
        ) : null}
      </div>
      {confirmModal}
    </AppShell>
  );
}
