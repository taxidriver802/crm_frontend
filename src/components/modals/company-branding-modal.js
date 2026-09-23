"use client";

import { useEffect, useId, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { ModalFrame } from "@/components/ui/overlay";
import { MarkPicker } from "@/components/brand/company-mark";
import { listPalettes } from "@/theme/registry";
import { cx } from "@/lib/cx";

export function CompanyBrandingModal({ open, company, onClose, onSaved }) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [markId, setMarkId] = useState("product");
  const [paletteId, setPaletteId] = useState("rooftop");
  const [logoFile, setLogoFile] = useState(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const palettes = listPalettes();

  useEffect(() => {
    if (!open) return;
    setName(company?.name || "");
    setMarkId(company?.mark_id || "product");
    setPaletteId(company?.palette_id || "rooftop");
    setLogoFile(null);
    setClearLogo(false);
    setError("");
    setSaving(false);
  }, [open, company]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let data = await api("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          mark_id: markId,
          palette_id: paletteId,
          clear_logo: clearLogo || undefined,
        }),
      });

      if (logoFile) {
        const body = new FormData();
        body.append("file", logoFile);
        const res = await fetch("/api/company/logo", {
          method: "POST",
          credentials: "include",
          body,
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new ApiError(data?.error || "Could not upload the logo.", res.status, data);
        }
      }

      onSaved?.(data.company);
      onClose?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save company branding.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={saving ? undefined : onClose}
      labelledBy={titleId}
      className="flex items-center justify-center overflow-hidden p-4"
      panelClassName="card relative flex min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 max-h-full flex-1 flex-col"
      >
        <div className="shrink-0 px-5 pt-5">
          <h2 id={titleId} className="section-heading">
            Company look
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Name, mark, and default palette for everyone in this company. Staff
            can still pick a personal palette inside the app.
          </p>
        </div>

        <div className="scrollbar-theme min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <Field label="Company name" htmlFor="company-name" required>
            <input
              id="company-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Company mark" help="Used when no custom logo is uploaded.">
            <MarkPicker value={markId} onChange={setMarkId} />
          </Field>

          <Field
            label="Custom logo"
            htmlFor="company-logo"
            help="Optional. PNG, JPG, WEBP, GIF, or SVG."
          >
            <input
              id="company-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="input"
              onChange={(e) => {
                setLogoFile(e.target.files?.[0] || null);
                if (e.target.files?.[0]) setClearLogo(false);
              }}
            />
          </Field>

          {company?.logo_url ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clearLogo}
                onChange={(e) => setClearLogo(e.target.checked)}
              />
              Remove uploaded logo
            </label>
          ) : null}

          <Field label="Company palette">
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Company palette">
              {palettes.map((palette) => {
                const selected = paletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cx(
                      "flex items-center gap-2 rounded-theme-md border px-2.5 py-2 text-left text-xs font-medium",
                      selected ? "border-strong bg-accent-soft" : "border-base hover:bg-accent-soft",
                    )}
                    onClick={() => setPaletteId(palette.id)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: palette.preview.accent }}
                      aria-hidden
                    />
                    {palette.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {error ? <Alert variant="inline">{error}</Alert> : null}
        </div>

        <FormActions className="shrink-0 border-t border-base px-5 py-3">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </FormActions>
      </form>
    </ModalFrame>
  );
}
