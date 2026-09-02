"use client";

import { Field, FormActions } from "@/components/ui/field";

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

  function handleNumberChange(key, rawValue, min, defaultValue) {
    if (rawValue === "") {
      setField(key, "");
      return;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      setField(key, defaultValue);
      return;
    }

    let value = Math.max(min, parsed);

    if (key === "quantity") {
      value = Math.max(min, Math.trunc(value));
    }

    if (key === "unit_price") {
      value = Math.max(min, Math.round(value * 100) / 100);
    }

    setField(key, value);
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
          <input
            className="input"
            placeholder="1"
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(e) => handleNumberChange("quantity", e.target.value, 1, 1)}
          />
        </Field>

        <Field label="Unit price">
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.unit_price}
            onChange={(e) => handleNumberChange("unit_price", e.target.value, 0, 0)}
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
