"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DEFAULT_PALETTE_ID,
  PALETTE_STORAGE_KEY,
  isPaletteId,
  listPalettes,
  readStoredPaletteId,
  readStoredCompanyPaletteId,
  writeStoredCompanyPaletteId,
  resolveTokens,
} from "@/theme/registry";
import { isAuthEntryPath, isPublicCustomerPath } from "@/theme/public-path";
import { syncThemeColorMeta } from "@/theme/sync-theme-color";

const ThemeControllerContext = createContext(null);

function applyPaletteAttribute(paletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", paletteId);
}

export function ThemeController({ children }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [personalPaletteId, setPersonalPaletteId] = useState(null);
  const [companyPaletteId, setCompanyPaletteIdState] = useState(null);
  const [ready, setReady] = useState(false);
  const brandedSurface =
    isPublicCustomerPath(pathname) || isAuthEntryPath(pathname);

  const activePaletteId = brandedSurface
    ? companyPaletteId || DEFAULT_PALETTE_ID
    : personalPaletteId || companyPaletteId || DEFAULT_PALETTE_ID;
  const usingCompanyDefault = !personalPaletteId;

  useEffect(() => {
    const personal = readStoredPaletteId();
    const company = readStoredCompanyPaletteId();
    setPersonalPaletteId(personal);
    setCompanyPaletteIdState(company);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyPaletteAttribute(activePaletteId);
  }, [activePaletteId, ready]);

  useEffect(() => {
    syncThemeColorMeta();
  }, [activePaletteId, resolvedTheme]);

  const setPaletteId = useCallback((nextId) => {
    const id = isPaletteId(nextId) ? nextId : DEFAULT_PALETTE_ID;
    setPersonalPaletteId(id);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const clearPersonalPalette = useCallback(() => {
    setPersonalPaletteId(null);
    try {
      window.localStorage.removeItem(PALETTE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setCompanyPaletteId = useCallback((nextId) => {
    const id = isPaletteId(nextId) ? nextId : null;
    setCompanyPaletteIdState(id);
    writeStoredCompanyPaletteId(id);
  }, []);

  const scheme = resolvedTheme === "dark" ? "dark" : "light";
  const tokens = useMemo(
    () => resolveTokens(activePaletteId, scheme),
    [activePaletteId, scheme],
  );
  const palettes = useMemo(() => listPalettes(), []);

  const value = useMemo(
    () => ({
      paletteId: activePaletteId,
      companyPaletteId: companyPaletteId || DEFAULT_PALETTE_ID,
      usingCompanyDefault,
      setPaletteId,
      clearPersonalPalette,
      setCompanyPaletteId,
      palettes,
      tokens,
      scheme,
    }),
    [
      activePaletteId,
      companyPaletteId,
      usingCompanyDefault,
      setPaletteId,
      clearPersonalPalette,
      setCompanyPaletteId,
      palettes,
      tokens,
      scheme,
    ],
  );

  return (
    <ThemeControllerContext.Provider value={value}>
      {children}
    </ThemeControllerContext.Provider>
  );
}

export function useThemeController() {
  const ctx = useContext(ThemeControllerContext);
  if (!ctx) {
    throw new Error("useThemeController must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeTokens() {
  return useThemeController().tokens;
}
