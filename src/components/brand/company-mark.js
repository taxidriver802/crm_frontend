"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { API_BASE } from "@/lib/helper";
import { cx } from "@/lib/cx";
import { companyMonogram } from "@/lib/monogram";
import { DEFAULT_PALETTE_ID, getPalette, isPaletteId } from "@/theme/registry";
import { useThemeController } from "@/components/theme/theme-controller";

/**
 * The company brand: what a tenant chose. Joist's own mark lives in
 * ./joist.js and never stands in for a company.
 *
 * `product` is the stored default mark id (rows and the column default hold
 * it). It used to draw the old product logo; it now draws the company's
 * initials on the company's accent.
 */
export const DEFAULT_COMPANY_MARK_ID = "product";

export const COMPANY_MARKS = [
  { id: "product", label: "Initials" },
  { id: "home", label: "Home" },
  { id: "briefcase", label: "Briefcase" },
  { id: "spark", label: "Spark" },
  { id: "users", label: "Team" },
  { id: "invoice", label: "Document" },
];

export function isCompanyMarkId(id) {
  return COMPANY_MARKS.some((mark) => mark.id === id);
}

export function companyLogoSrc(logoUrl) {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE}${logoUrl}`;
}

/** The company's own accent and the ink that reads on it, whatever palette the viewer picked. */
export function companyAccent(paletteId) {
  const palette = getPalette(isPaletteId(paletteId) ? paletteId : DEFAULT_PALETTE_ID);
  return { accent: palette.light["--accent"], onAccent: palette.light["--on-accent"] };
}

/** CompanyMark props from a company record (workspace, public branding, auth). */
export function companyMarkProps(company) {
  if (!company) return {};
  return {
    markId: company.mark_id,
    logoUrl: company.logo_url,
    name: company.name,
    paletteId: company.palette_id,
  };
}

/**
 * Logo if uploaded, else the chosen icon, else the initials tile.
 * With no company yet (still loading) it is a quiet empty tile, so nothing
 * from another company or from Joist flashes in its place.
 */
export function CompanyMark({
  markId = DEFAULT_COMPANY_MARK_ID,
  logoUrl,
  name,
  paletteId,
  className = "h-8 w-8",
  alt = "",
}) {
  const decorative = !alt;
  const src = companyLogoSrc(logoUrl);
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        aria-hidden={decorative || undefined}
        data-company-mark="logo"
        className={cx("shrink-0 rounded-theme-sm object-cover", className)}
      />
    );
  }

  if (markId && markId !== DEFAULT_COMPANY_MARK_ID && isCompanyMarkId(markId)) {
    return (
      <span className="contents" data-company-mark="icon">
        <Icon name={markId} className={className} />
      </span>
    );
  }

  const letters = companyMonogram(name);
  if (!letters) {
    return (
      <span
        aria-hidden
        data-company-mark="pending"
        className={cx("inline-block shrink-0 rounded-theme-sm bg-current opacity-[0.12]", className)}
      />
    );
  }

  const { accent, onAccent } = companyAccent(paletteId);
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative || undefined}
      data-company-mark="monogram"
      data-monogram={letters}
      className={cx("inline-block shrink-0 overflow-hidden rounded-theme-sm", className)}
      style={{ background: accent, color: onAccent }}
    >
      <svg viewBox="0 0 32 32" className="block h-full w-full" focusable="false">
        <text
          x="16"
          y="16"
          dy="0.36em"
          textAnchor="middle"
          fontSize={letters.length > 1 ? 13.5 : 16}
          fontWeight="600"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          {letters}
        </text>
      </svg>
    </span>
  );
}

/** Mark choices. The Initials option previews this company's own tile. */
export function MarkPicker({ value, onChange, name, paletteId, className = "" }) {
  const selected = isCompanyMarkId(value) ? value : DEFAULT_COMPANY_MARK_ID;
  const previewName = companyMonogram(name) ? name : "Your Company";

  return (
    <div
      className={cx("grid grid-cols-3 gap-2", className)}
      role="radiogroup"
      aria-label="Company mark"
    >
      {COMPANY_MARKS.map((mark) => {
        const active = selected === mark.id;
        return (
          <button
            key={mark.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cx(
              "flex flex-col items-center gap-1.5 rounded-theme-md border px-2 py-2.5 text-[11px] font-medium transition",
              active
                ? "border-strong bg-accent-soft"
                : "border-base hover:bg-accent-soft",
            )}
            onClick={() => onChange?.(mark.id)}
          >
            <CompanyMark
              markId={mark.id}
              name={previewName}
              paletteId={paletteId}
              className="h-6 w-6"
            />
            {mark.label}
          </button>
        );
      })}
    </div>
  );
}

export function publicBrandProps(company) {
  if (!company) return {};
  return {
    companyName: company.name,
    markId: company.mark_id,
    logoUrl: company.logo_url,
    paletteId: company.palette_id,
  };
}

export function usePublicCompanyTheme(company) {
  const { setCompanyPaletteId } = useThemeController();
  useEffect(() => {
    if (company?.palette_id) setCompanyPaletteId(company.palette_id);
  }, [company?.palette_id, setCompanyPaletteId]);
}
