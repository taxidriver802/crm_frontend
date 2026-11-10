"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
import { watchThemeColorMeta } from "@/theme/sync-theme-color";

const ThemeControllerContext = createContext(null);

function applyPaletteAttribute(paletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", paletteId);
}

/*
 * The palette choices live in localStorage (the inline boot script in
 * registry.js reads the same keys before paint). They are read through
 * useSyncExternalStore so the server render and hydration agree (null), the
 * stored value arrives right after, and another tab's change follows along.
 * A write that storage refuses (private mode, quota) is kept in memory for
 * this tab.
 */
const paletteListeners = new Set();
const paletteMemory = new Map();

function notifyPalette() {
  for (const listener of paletteListeners) listener();
}

function subscribePalette(listener) {
  paletteListeners.add(listener);
  const onStorage = () => {
    paletteMemory.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    paletteListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function rememberPalette(key, id) {
  paletteMemory.set(key, id);
  notifyPalette();
}

const readPersonalPalette = () =>
  paletteMemory.has("personal") ? paletteMemory.get("personal") : readStoredPaletteId();
const readCompanyPalette = () =>
  paletteMemory.has("company") ? paletteMemory.get("company") : readStoredCompanyPaletteId();
const readNothingOnServer = () => null;
const subscribeNever = () => () => {};

export function ThemeController({ children }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const personalPaletteId = useSyncExternalStore(subscribePalette, readPersonalPalette, readNothingOnServer);
  const companyPaletteId = useSyncExternalStore(subscribePalette, readCompanyPalette, readNothingOnServer);
  // False for the server render and hydration, true once the browser owns the page.
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const brandedSurface =
    isPublicCustomerPath(pathname) || isAuthEntryPath(pathname);

  // Register makes a new company, so no remembered company's palette
  // belongs there: it wears Joist's default (Ember) like the rest of its brand.
  const activePaletteId =
    pathname === "/register"
      ? DEFAULT_PALETTE_ID
      : brandedSurface
        ? companyPaletteId || DEFAULT_PALETTE_ID
        : personalPaletteId || companyPaletteId || DEFAULT_PALETTE_ID;
  const usingCompanyDefault = !personalPaletteId;

  useEffect(() => {
    if (!ready) return;
    applyPaletteAttribute(activePaletteId);
  }, [activePaletteId, ready]);

  // Browser chrome follows the active palette (signed in: the person's own,
  // else the company's), and keeps following it when Next rewrites the head.
  useEffect(() => watchThemeColorMeta(), [activePaletteId, resolvedTheme]);

  const setPaletteId = useCallback((nextId) => {
    const id = isPaletteId(nextId) ? nextId : DEFAULT_PALETTE_ID;
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
    rememberPalette("personal", id);
  }, []);

  const clearPersonalPalette = useCallback(() => {
    try {
      window.localStorage.removeItem(PALETTE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    rememberPalette("personal", null);
  }, []);

  const setCompanyPaletteId = useCallback((nextId) => {
    const id = isPaletteId(nextId) ? nextId : null;
    writeStoredCompanyPaletteId(id);
    rememberPalette("company", id);
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
