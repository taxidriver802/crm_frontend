export const COMPANY_SLUG_STORAGE_KEY = "crm-company-slug";
export const COMPANY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeCompanySlug(value) {
  return String(value || "").trim().toLowerCase();
}

export function readStoredCompanySlug() {
  if (typeof window === "undefined") return "";
  try {
    return normalizeCompanySlug(
      window.localStorage.getItem(COMPANY_SLUG_STORAGE_KEY)
    );
  } catch {
    return "";
  }
}

export function writeStoredCompanySlug(slug) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeCompanySlug(slug);
    if (!normalized) {
      window.localStorage.removeItem(COMPANY_SLUG_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(COMPANY_SLUG_STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredCompanySlug() {
  writeStoredCompanySlug("");
}
