"use client";

import { useEffect } from "react";
import MainLogo from "@/assets/mainlogo.svg";
import { Icon } from "@/components/icons";
import { API_BASE } from "@/lib/helper";
import { cx } from "@/lib/cx";
import { useThemeController } from "@/components/theme/theme-controller";

export const DEFAULT_COMPANY_MARK_ID = "product";

export const COMPANY_MARKS = [
  { id: "product", label: "Default" },
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

export function CompanyMark({
  markId = DEFAULT_COMPANY_MARK_ID,
  logoUrl,
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
        className={cx("shrink-0 rounded-theme-sm object-cover", className)}
      />
    );
  }

  if (markId && markId !== "product" && isCompanyMarkId(markId)) {
    return <Icon name={markId} className={className} />;
  }

  return (
    <MainLogo
      className={cx("shrink-0", className)}
      aria-hidden={decorative || undefined}
      focusable="false"
    />
  );
}

export function MarkPicker({ value, onChange, className = "" }) {
  const selected = isCompanyMarkId(value) ? value : DEFAULT_COMPANY_MARK_ID;

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
            <CompanyMark markId={mark.id} className="h-6 w-6" />
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
  };
}

export function usePublicCompanyTheme(company) {
  const { setCompanyPaletteId } = useThemeController();
  useEffect(() => {
    if (company?.palette_id) setCompanyPaletteId(company.palette_id);
  }, [company?.palette_id, setCompanyPaletteId]);
}
