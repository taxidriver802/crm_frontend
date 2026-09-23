"use client";

import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput, NumberInput } from "@/components/ui/formatted-inputs";

export function createEmptyLineItem() {
  return {
    name: "",
    description: "",
    quantity: "",
    unit_price: "",
  };
}

export function EstimateLineItemForm({
  form,
  onChange,
  onSubmit,
  saving,
  onCancel,
  submitLabel,
  deleteButton = false,
  onDelete,
}) {
  function setField(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  function handleQuantityChange(rawValue) {
    if (rawValue === "") {
      setField("quantity", "");
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    setField("quantity", Math.max(1, Math.trunc(parsed)));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Item name" required>
        <input
          className="input"
          placeholder="Item name"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
        />
      </Field>
      <Field label="Description">
        <input
          className="input"
          placeholder="Description (optional)"
          value={form.description || ""}
          onChange={(e) => setField("description", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <NumberInput
            placeholder="1"
            value={form.quantity}
            onChange={handleQuantityChange}
          />
        </Field>

        <Field label="Unit price">
          <CurrencyInput
            cents
            placeholder="$0.00"
            value={form.unit_price}
            onChange={(value) => setField("unit_price", value)}
          />
        </Field>
      </div>
      <div className="flex w-full flex-row items-center justify-between">
        <FormActions>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : submitLabel}
          </button>

          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </FormActions>
        {deleteButton && (
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            onClick={onDelete}
            disabled={saving}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
