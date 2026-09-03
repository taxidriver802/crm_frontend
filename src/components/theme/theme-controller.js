"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DEFAULT_PALETTE_ID,
  PALETTE_STORAGE_KEY,
  isPaletteId,
  listPalettes,
  readStoredPaletteId,
  resolveTokens,
} from "@/theme/registry";
import { isPublicCustomerPath } from "@/theme/public-path";
import { syncThemeColorMeta } from "@/theme/sync-theme-color";

const ThemeControllerContext = createContext(null);

function applyPaletteAttribute(paletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", paletteId);
}

export function ThemeController({ children }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [paletteId, setPaletteIdState] = useState(DEFAULT_PALETTE_ID);
  const [ready, setReady] = useState(false);
  const publicSurface = isPublicCustomerPath(pathname);
  const activePaletteId = publicSurface ? DEFAULT_PALETTE_ID : paletteId;

  useEffect(() => {
    const stored = readStoredPaletteId();
    setPaletteIdState(stored);
    applyPaletteAttribute(publicSurface ? DEFAULT_PALETTE_ID : stored);
    setReady(true);
    // publicSurface is applied via the effect below after ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setPaletteIdState(id);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
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
      setPaletteId,
      palettes,
      tokens,
      scheme,
    }),
    [activePaletteId, setPaletteId, palettes, tokens, scheme],
  );

  return (
    <ThemeControllerContext.Provider value={value}>{children}</ThemeControllerContext.Provider>
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
