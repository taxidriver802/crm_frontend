"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { ToggleFormSection } from "@/components/toggle-form-section";
import {
  EstimateLineItemForm,
  createEmptyLineItem,
} from "@/components/forms/estimate-line-item-form";
import Link from "next/link";

function StatusBadge({ status }) {
  const map = {
    Draft: "border-gray-500/30 bg-gray-500/10 text-gray-700",
    Sent: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    Approved: "border-green-500/30 bg-green-500/10 text-green-700",
    Rejected: "border-red-500/30 bg-red-500/10 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${map[status] || ""}`}
    >
      {status}
    </span>
  );
}

export default function EstimateDetailPage() {
  const { id } = useParams();

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
  const lineItems = estimate?.line_items || [];

  async function loadEstimate() {
    const res = await api(`/estimates/${id}`);

    const data = res?.estimate ?? res;
    setEstimate(data);
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

  async function handleDeleteLineItem() {
    if (!editingLineItem) return;

    const confirmed = window.confirm("Delete this line item?");
    if (!confirmed) return;

    setSavingItem(true);
    setError("");

    try {
      const res = await api(`/estimates/${id}/line-items/${editingLineItem.id}`, {
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
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        {/* HEADER */}
        <section className="card rounded-lg p-4">
          {loading ? (
            <div className="text-muted text-sm">Loading estimate…</div>
          ) : !estimate ? (
            <div className="text-muted text-sm">Estimate not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-semibold">{estimate.title}</div>
                  <Link
                    href={`/jobs/${estimate.job?.id ?? estimate.job_id}`}
                    className="text-muted mt-1 cursor-pointer text-sm underline"
                  >
                    Job #{estimate.job_id}
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    className="btn text-muted btn-ghost btn-sm hover:bg-surface cursor-pointer"
                    href={`/estimates/${estimate.id}/edit`}
                  >
                    Edit
                  </Link>
                  <StatusBadge status={estimate.status} />
                </div>
              </div>

              {estimate.notes ? (
                <div>
                  <div className="text-muted text-xs">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{estimate.notes}</div>
                </div>
              ) : null}
            </div>
          )}
        </section>

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
          defaultOpen
          actions={
            <div className="flex items-center gap-2">
              <div className="text-main text-sm">Sort By:</div>
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
                  className={`btn btn-sm ${
                    sortBy === key ? "btn-primary:hover" : "btn-ghost"
                  } px-3 py-1 text-xs`}
                >
                  {label}
                  {sortBy === key && (sortDirection === "desc" ? " ↓" : " ↑")}
                </button>
              ))}
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
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No line items yet.
            </div>
          ) : (
            <div className="space-y-3">
              {displayedLineItems.map((item) => (
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
        <section className="card rounded-lg p-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${formatCurrency(estimate?.grand_total)}</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
