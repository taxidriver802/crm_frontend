"use client";

import { Alert } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ToggleFormSection } from "@/components/toggle-form-section";
import {
  EstimateLineItemForm,
  createEmptyLineItem,
} from "@/components/forms/estimate-line-item-form";
import Link from "next/link";
import { API_BASE } from "@/lib/helper";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailHeader } from "@/components/ui/detail-header";
import { MetaItem } from "@/components/ui/meta";

export default function EstimateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [lineItemForm, setLineItemForm] = useState(createEmptyLineItem());
  const [savingItem, setSavingItem] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [showAllLineItems, setShowAllLineItems] = useState(false);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [shareHint, setShareHint] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const lineItems = estimate?.line_items || [];

  async function loadEstimate() {
    const res = await api(`/estimates/${id}`);

    const data = res?.estimate ?? res;
    setEstimate(data);
  }

  async function downloadPdf() {
    setPdfBusy(true);
    setShareHint("");
    try {
      const res = await fetch(`${API_BASE}/estimates/${id}/pdf`, {
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
      a.download = `estimate-${id}.pdf`;
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
      const res = await api(`/estimates/${id}/share`, { method: "POST" });
      const url = res.share_url;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareHint("Share link copied to clipboard (expires with the estimate link).");
      } else {
        setShareHint(url);
      }
      if (res.estimate) {
        setEstimate(res.estimate);
      } else {
        await loadEstimate();
      }
    } catch (e) {
      setError(e?.message || "Could not create share link");
    } finally {
      setShareBusy(false);
    }
  }

  /** After client declines or asks for revision: clear response, set Sent, new token, copy link. */
  async function resendToClient() {
    setResendBusy(true);
    setShareHint("");
    setError("");
    try {
      const res = await api(`/estimates/${id}/resend`, { method: "POST" });
      const url = res.share_url;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareHint(
          "New share link copied. Status is now Sent — the client can respond again on the new link.",
        );
      } else {
        setShareHint(url);
      }
      if (res.estimate) {
        setEstimate(res.estimate);
      } else {
        await loadEstimate();
      }
    } catch (e) {
      setError(e?.message || "Could not resend to client");
    } finally {
      setResendBusy(false);
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      await loadEstimate();
    } catch (e) {
      setError(e?.message || "Failed to load estimate");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvoice() {
    setInvoiceBusy(true);
    setError("");
    try {
      const res = await api(`/invoices/from-estimate/${id}`, { method: "POST" });
      router.push(`/invoices/${res.invoice.id}`);
    } catch (e) {
      setError(e?.message || "Failed to create invoice");
    } finally {
      setInvoiceBusy(false);
    }
  }

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  async function handleSubmitLineItem(e) {
    e.preventDefault();
    setSavingItem(true);

    const quantity = lineItemForm.quantity === "" ? 1 : Number(lineItemForm.quantity);
    if (quantity < 1) {
      setError("Quantity must be at least 1.");
      setSavingItem(false);
      return;
    }

    try {
      const path = editingLineItem
        ? `/estimates/${id}/line-items/${editingLineItem.id}`
        : `/estimates/${id}/line-items`;

      const method = editingLineItem ? "PATCH" : "POST";

      const res = await api(path, {
        method,
        body: JSON.stringify(lineItemForm),
      });

      setEstimate(res.estimate);
      setLineItemForm(createEmptyLineItem());
      setEditingLineItem(null);
      setIsCreateOpen(false);
    } catch (e) {
      console.error(e);
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
        setError("");

        try {
          await api(`/estimates/${id}/line-items/${editingLineItem.id}`, {
            method: "DELETE",
          });

          await loadEstimate();
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
      setError("");
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

  const formatCurrency = (num) => {
    return Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  function formatDate(input) {
    const date = new Date(input);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  }

  function sortLineItems(items, sortBy, sortDirection = "desc") {
    return [...items].sort((a, b) => {
      let aVal;
      let bVal;

      if (sortBy === "line_total" || sortBy === "unit_price" || sortBy === "quantity") {
        aVal = Number(a[sortBy] ?? 0);
        bVal = Number(b[sortBy] ?? 0);
      } else if (sortBy === "updated_at") {
        aVal = new Date(a.updated_at || a.created_at).getTime();
        bVal = new Date(b.updated_at || b.created_at).getTime();
      } else if (sortBy === "created_at") {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = String(a[sortBy] ?? "").toLowerCase();
        bVal = String(b[sortBy] ?? "").toLowerCase();

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  const sortedLineItems = sortLineItems(lineItems, sortBy, sortDirection);
  const displayedLineItems = showAllLineItems
    ? sortedLineItems
    : sortedLineItems.slice(0, 3);

  return (
    <AppShell title={estimate?.title || `Estimate #${id}`}>
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        {loading ? (
          <DetailHeader title="Loading estimate…" />
        ) : !estimate ? (
          <DetailHeader title="Estimate not found" />
        ) : (
          <DetailHeader
            title={estimate.title}
            subtitle={
              <Link
                href={`/jobs/${estimate.job?.id ?? estimate.job_id}`}
                className="underline"
              >
                Job #{estimate.job_id}
              </Link>
            }
            badges={<StatusBadge kind="estimate" status={estimate.status} />}
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={pdfBusy}
                  onClick={downloadPdf}
                >
                  {pdfBusy ? "PDF…" : "Download PDF"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={shareBusy}
                  onClick={createShareLink}
                >
                  {shareBusy ? "Link…" : "Copy share link"}
                </button>
                {estimate.status === "Approved" ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={invoiceBusy}
                    onClick={handleCreateInvoice}
                  >
                    {invoiceBusy ? "Creating…" : "Create Invoice"}
                  </button>
                ) : null}
                <Link
                  className="btn btn-ghost btn-sm"
                  href={`/estimates/${estimate.id}/edit`}
                >
                  Edit
                </Link>
              </>
            }
          >

              {shareHint ? <div className="text-muted text-sm">{shareHint}</div> : null}

              {estimate.share_expires_at ? (
                <div className="text-muted text-xs">
                  Share link active until{" "}
                  {new Date(estimate.share_expires_at).toLocaleString()}
                </div>
              ) : null}

              {estimate.client_responded_at ? (
                <div className="border-base space-y-3 rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">Client response</div>
                    <div className="text-muted mt-1 text-xs">
                      {new Date(estimate.client_responded_at).toLocaleString()}
                    </div>
                  </div>

                  {estimate.status === "Approved" ? (
                    <p className="text-main leading-relaxed">
                      The client accepted this estimate.
                    </p>
                  ) : estimate.status === "Rejected" ? (
                    <p className="text-main leading-relaxed">
                      The client declined. Adjust line items or pricing, then use{" "}
                      <strong>Resend to client</strong> when you are ready to send a fresh
                      link.
                    </p>
                  ) : (
                    <p className="text-main leading-relaxed">
                      The client asked for changes (or you moved back to Draft). Update
                      the scope or pricing here or on <strong>Edit</strong>, then resend
                      when the estimate is ready to review again.
                    </p>
                  )}

                  {estimate.client_response_note ? (
                    <div className="bg-surface border-base whitespace-pre-wrap rounded-md border border-dashed p-3">
                      {estimate.client_response_note}
                    </div>
                  ) : null}

                  {(estimate.status === "Draft" || estimate.status === "Rejected") && (
                    <div className="border-base space-y-2 border-t pt-3">
                      <div className="text-xs font-medium">Your next steps</div>
                      <ul className="text-muted list-inside list-disc space-y-1 text-xs leading-relaxed">
                        <li>
                          Edit line items below, or open{" "}
                          <Link
                            href={`/estimates/${estimate.id}/edit`}
                            className="text-main underline underline-offset-2"
                          >
                            Edit
                          </Link>{" "}
                          to change title, notes, or status.
                        </li>
                        <li>
                          When the estimate is ready to send again, click{" "}
                          <strong>Resend to client</strong>. That clears this response
                          record, sets status to <strong>Sent</strong>, creates a new
                          link, and copies it — the previous link stops working.
                        </li>
                      </ul>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          className="btn btn-ghost btn-sm px-3 py-1.5"
                          href={`/estimates/${estimate.id}/edit`}
                        >
                          Edit details
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm px-3 py-1.5"
                          disabled={resendBusy}
                          onClick={resendToClient}
                        >
                          {resendBusy ? "Working…" : "Resend to client"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {estimate.notes ? (
                <MetaItem label="Notes">
                  <span className="whitespace-pre-wrap">{estimate.notes}</span>
                </MetaItem>
              ) : null}
          </DetailHeader>
        )}

        <ToggleFormSection
          title={editingLineItem ? "Edit Line Item" : "Create Line Item"}
          description={
            editingLineItem ? "Update this estimate item." : "Add items to this estimate."
          }
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((prev) => !prev)}
          openLabel="+ New Item"
          closeLabel="Hide Form"
        >
          <EstimateLineItemForm
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

        {/* LINE ITEMS */}
        <CollapsibleSection
          title="Line Items"
          description="Breakdown of materials and labor."
          syncKey={id}
          ready={!loading}
          empty={lineItems.length === 0}
          actions={
            <div className="flex min-w-0 max-w-full flex-1 items-center gap-2">
              <div className="text-main shrink-0 text-sm">Sort By:</div>
              <div className="relative min-w-0 flex-1">
                <div className="scrollbar-theme bg-surface border-base flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain rounded-theme-md border py-1 pl-1.5 pr-6">
                  {[
                    { key: "updated_at", label: "Last updated" },
                    { key: "created_at", label: "Created at" },
                    { key: "unit_price", label: "Unit price" },
                    { key: "quantity", label: "Quantity" },
                    { key: "line_total", label: "Total price" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (sortBy === key) {
                          setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        } else {
                          setSortBy(key);
                          setSortDirection("desc");
                        }
                      }}
                      className={`btn btn-sm shrink-0 whitespace-nowrap ${
                        sortBy === key ? "btn-primary" : "btn-ghost"
                      }`}
                    >
                      {label}
                      {sortBy === key && (sortDirection === "desc" ? " ↓" : " ↑")}
                    </button>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="from-surface pointer-events-none absolute inset-y-px right-px w-8 rounded-r-[calc(var(--radius-md)-1px)] bg-gradient-to-l to-transparent"
                />
              </div>
            </div>
          }
          secondaryActions={
            lineItems.length > 3 && (
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => setShowAllLineItems((prev) => !prev)}
              >
                {showAllLineItems ? "Show less" : "Show all"}
              </button>
            )
          }
        >
          {loading ? (
            <div className="text-muted text-sm">Loading items…</div>
          ) : lineItems.length === 0 ? (
            <div className="empty-state text-sm">No line items yet.</div>
          ) : (
            <div className="space-y-3">
              {displayedLineItems.map((item) => (
                <div
                  key={item.id}
                  className="list-row list-row-interactive flex w-full items-start justify-between text-left"
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

                  <div className="flex flex-col items-end gap-2 font-semibold">
                    ${formatCurrency(item.line_total)}
                    <div className="text-muted text-sm">
                      {!item ? null : (
                        <>
                          {item.updated_at === item.created_at
                            ? "Created: "
                            : "Updated: "}
                          {formatDate(item.updated_at || item.created_at)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* TOTAL */}
        <section className="card p-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${formatCurrency(estimate?.grand_total)}</span>
          </div>
        </section>
      </div>
      {confirmModal}
    </AppShell>
  );
}
