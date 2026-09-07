"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { ToggleFormSection } from "@/components/toggle-form-section";
import {
  EstimateLineItemForm,
  createEmptyLineItem,
} from "@/components/forms/estimate-line-item-form";
import { Field, FormActions } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/error-boundary";
import { SectionCard } from "@/components/ui/section-card";

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function templateSubtotal(template) {
  return (template?.line_items || []).reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unit_price || 0);
  }, 0);
}

export default function EstimateTemplatesPage() {
  const router = useRouter();
  const { askConfirm, confirmModal } = useConfirmModal();

  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [nameForm, setNameForm] = useState({ name: "", description: "" });
  const [lineItemForm, setLineItemForm] = useState(createEmptyLineItem());
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [lineFormOpen, setLineFormOpen] = useState(false);
  const [savingLine, setSavingLine] = useState(false);

  const selected = useMemo(
    () => templates.find((row) => row.id === selectedId) || null,
    [templates, selectedId],
  );

  async function loadTemplates() {
    const res = await api("/estimate-templates");
    const next = res?.templates || [];
    setTemplates(next);
    return next;
  }

  useEffect(() => {
    async function boot() {
      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        const user = meData.user;
        if (user?.role !== "owner" && user?.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        const next = await loadTemplates();
        setSelectedId((prev) => prev ?? next[0]?.id ?? null);
      } catch (err) {
        setError(err?.message || "Failed to load templates");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [router]);

  useEffect(() => {
    if (!selected) {
      setNameForm({ name: "", description: "" });
      return;
    }
    setNameForm({
      name: selected.name || "",
      description: selected.description || "",
    });
  }, [selected]);

  async function handleCreate(event) {
    event.preventDefault();
    if (creating) return;
    setError("");
    setCreating(true);
    try {
      const res = await api("/estimate-templates", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
        }),
      });
      const created = res?.template;
      setCreateForm({ name: "", description: "" });
      setCreateOpen(false);
      const next = await loadTemplates();
      setSelectedId(created?.id ?? next[0]?.id ?? null);
    } catch (err) {
      setError(err?.message || "Failed to create template");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveMeta(event) {
    event.preventDefault();
    if (!selected || savingMeta) return;
    setError("");
    setSavingMeta(true);
    try {
      await api(`/estimate-templates/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: nameForm.name.trim(),
          description: nameForm.description.trim() || null,
        }),
      });
      await loadTemplates();
    } catch (err) {
      setError(err?.message || "Failed to update template");
    } finally {
      setSavingMeta(false);
    }
  }

  function handleDeleteTemplate() {
    if (!selected) return;
    askConfirm({
      title: "Delete this template?",
      description: "Line items on this template will be removed. Existing estimates are unchanged.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setError("");
        try {
          await api(`/estimate-templates/${selected.id}`, { method: "DELETE" });
          const next = await loadTemplates();
          setSelectedId(next[0]?.id ?? null);
        } catch (err) {
          setError(err?.message || "Failed to delete template");
        }
      },
    });
  }

  async function handleSubmitLineItem(event) {
    event.preventDefault();
    if (!selected) return;
    setSavingLine(true);
    setError("");
    try {
      const path = editingLineItem
        ? `/estimate-templates/${selected.id}/line-items/${editingLineItem.id}`
        : `/estimate-templates/${selected.id}/line-items`;
      await api(path, {
        method: editingLineItem ? "PATCH" : "POST",
        body: JSON.stringify(lineItemForm),
      });
      setLineItemForm(createEmptyLineItem());
      setEditingLineItem(null);
      setLineFormOpen(false);
      await loadTemplates();
    } catch (err) {
      setError(err?.message || "Failed to save line item");
    } finally {
      setSavingLine(false);
    }
  }

  function handleDeleteLineItem() {
    if (!selected || !editingLineItem) return;
    askConfirm({
      title: "Delete this line item?",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setSavingLine(true);
        setError("");
        try {
          await api(
            `/estimate-templates/${selected.id}/line-items/${editingLineItem.id}`,
            { method: "DELETE" },
          );
          setLineItemForm(createEmptyLineItem());
          setEditingLineItem(null);
          setLineFormOpen(false);
          await loadTemplates();
        } catch (err) {
          setError(err?.message || "Failed to delete line item");
        } finally {
          setSavingLine(false);
        }
      },
    });
  }

  return (
    <AppShell title="Estimate templates">
      {confirmModal}
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <ToggleFormSection
          title="New template"
          description="Instance-wide packages. Applying a template copies lines onto a draft estimate."
          isOpen={createOpen}
          onToggle={() => setCreateOpen((prev) => !prev)}
          openLabel="+ New template"
          closeLabel="Hide form"
        >
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Name" required>
              <input
                className="input"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </Field>
            <Field label="Description">
              <input
                className="input"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Field>
            <FormActions>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create template"}
              </button>
            </FormActions>
          </form>
        </ToggleFormSection>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <SectionCard title="Templates" size="lg">
            {loading ? (
              <div className="text-muted text-sm">Loading templates…</div>
            ) : templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                description="Create a package to reuse on new estimates."
              />
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <ListRow
                    key={template.id}
                    as="button"
                    type="button"
                    interactive
                    className={`w-full text-left ${
                      template.id === selectedId ? "border-strong bg-accent" : ""
                    }`}
                    onClick={() => setSelectedId(template.id)}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-muted mt-1 text-xs">
                      {(template.line_items || []).length} lines · $
                      {formatCurrency(templateSubtotal(template))}
                    </div>
                  </ListRow>
                ))}
              </div>
            )}
          </SectionCard>

          {selected ? (
            <div className="space-y-4">
              <SectionCard
                title={selected.name}
                description={selected.description || "Edit name and line items."}
                size="lg"
                right={
                  <button
                    type="button"
                    className="btn btn-danger px-3 py-2 text-xs"
                    onClick={handleDeleteTemplate}
                  >
                    Delete
                  </button>
                }
              >
                <form onSubmit={handleSaveMeta} className="space-y-3">
                  <Field label="Name" required>
                    <input
                      className="input"
                      value={nameForm.name}
                      onChange={(e) =>
                        setNameForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Description">
                    <input
                      className="input"
                      value={nameForm.description}
                      onChange={(e) =>
                        setNameForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <FormActions>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingMeta}
                    >
                      {savingMeta ? "Saving…" : "Save details"}
                    </button>
                  </FormActions>
                </form>
              </SectionCard>

              <ToggleFormSection
                title={editingLineItem ? "Edit line item" : "Add line item"}
                description="Copied onto draft estimates as manual lines."
                isOpen={lineFormOpen}
                onToggle={() => {
                  setLineFormOpen((prev) => !prev);
                  if (lineFormOpen) {
                    setEditingLineItem(null);
                    setLineItemForm(createEmptyLineItem());
                  }
                }}
                openLabel="+ New item"
                closeLabel="Hide form"
              >
                <EstimateLineItemForm
                  form={lineItemForm}
                  onChange={setLineItemForm}
                  onSubmit={handleSubmitLineItem}
                  saving={savingLine}
                  onCancel={() => {
                    setLineItemForm(createEmptyLineItem());
                    setEditingLineItem(null);
                    setLineFormOpen(false);
                  }}
                  submitLabel={editingLineItem ? "Update item" : "Add item"}
                  deleteButton={!!editingLineItem}
                  onDelete={handleDeleteLineItem}
                />
              </ToggleFormSection>

              <SectionCard
                title="Line items"
                description={`Package total $${formatCurrency(templateSubtotal(selected))}`}
                size="lg"
              >
                {(selected.line_items || []).length === 0 ? (
                  <div className="text-muted text-sm">No line items yet.</div>
                ) : (
                  <div className="space-y-2">
                    {selected.line_items.map((item) => (
                      <ListRow
                        key={item.id}
                        as="button"
                        type="button"
                        interactive
                        className="flex w-full items-start justify-between text-left"
                        onClick={() => {
                          setEditingLineItem(item);
                          setLineItemForm({
                            name: item.name || "",
                            description: item.description || "",
                            quantity: item.quantity ?? "",
                            unit_price: item.unit_price ?? "",
                          });
                          setLineFormOpen(true);
                        }}
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description ? (
                            <div className="text-muted mt-1 text-sm">
                              {item.description}
                            </div>
                          ) : null}
                          <div className="text-muted mt-1 text-xs">
                            {Number(item.quantity).toLocaleString("en-US")} × $
                            {formatCurrency(item.unit_price)}
                          </div>
                        </div>
                        <div className="font-semibold">
                          $
                          {formatCurrency(
                            Number(item.quantity || 0) * Number(item.unit_price || 0),
                          )}
                        </div>
                      </ListRow>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          ) : !loading ? (
            <EmptyState
              title="Select a template"
              description="Choose a package on the left to edit its lines."
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
