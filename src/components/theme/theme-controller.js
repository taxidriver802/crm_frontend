"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  DEFAULT_PALETTE_ID,
  PALETTE_STORAGE_KEY,
  isPaletteId,
  listPalettes,
  readStoredPaletteId,
  resolveTokens,
} from "@/theme/registry";
import { syncThemeColorMeta } from "@/theme/sync-theme-color";

const ThemeControllerContext = createContext(null);

function applyPaletteAttribute(paletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", paletteId);
}

export function ThemeController({ children }) {
  const { resolvedTheme } = useTheme();
  const [paletteId, setPaletteIdState] = useState(DEFAULT_PALETTE_ID);

  useEffect(() => {
    const stored = readStoredPaletteId();
    setPaletteIdState(stored);
    applyPaletteAttribute(stored);
  }, []);

  useEffect(() => {
    applyPaletteAttribute(paletteId);
  }, [paletteId]);

  useEffect(() => {
    syncThemeColorMeta();
  }, [paletteId, resolvedTheme]);

  const setPaletteId = useCallback((nextId) => {
    const id = isPaletteId(nextId) ? nextId : DEFAULT_PALETTE_ID;
    setPaletteIdState(id);
    applyPaletteAttribute(id);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const scheme = resolvedTheme === "dark" ? "dark" : "light";
  const tokens = useMemo(() => resolveTokens(paletteId, scheme), [paletteId, scheme]);
  const palettes = useMemo(() => listPalettes(), []);

  const value = useMemo(
    () => ({
      paletteId,
      setPaletteId,
      palettes,
      tokens,
      scheme,
    }),
    [paletteId, setPaletteId, palettes, tokens, scheme],
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
