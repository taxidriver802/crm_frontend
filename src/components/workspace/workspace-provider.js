"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import { applyPatch, pinKey, withDefaults } from "@/lib/preferences";
import { useThemeController } from "@/components/theme/theme-controller";
import { useToast } from "@/components/toast/toast-provider";
import { writeStoredCompanySlug } from "@/lib/company-slug";

const WorkspaceContext = createContext(null);

const DENSITY_KEY = "crm-density";
const SAVE_DELAY_MS = 350;

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function resolveEffective(defaults, mine) {
  const out = {};
  const keys = new Set([...Object.keys(defaults || {}), ...Object.keys(mine || {})]);
  for (const key of keys) {
    const d = defaults?.[key];
    const u = mine?.[key];
    if (isObject(d) && isObject(u)) out[key] = { ...d, ...u };
    else out[key] = u !== undefined ? u : d;
  }
  return out;
}

function mergePatches(a, b) {
  const out = { ...a };
  for (const [section, value] of Object.entries(b)) {
    if (value === null || !isObject(value) || !isObject(out[section])) out[section] = value;
    else out[section] = { ...out[section], ...value };
  }
  return out;
}

function applyDocumentAppearance(appearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const density = appearance?.density === "compact" ? "compact" : "comfortable";
  root.dataset.density = density;
  if (appearance?.reduceMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
  try {
    window.localStorage.setItem(DENSITY_KEY, density);
  } catch {
    /* private mode */
  }
}

/**
 * The signed-in person, their company, and how they have shaped the
 * workspace. Loaded once per shell; every customizable surface reads from
 * here and writes through `updatePrefs`, which applies optimistically and
 * saves to /me/preferences in the background.
 */
export function WorkspaceProvider({ children }) {
  const { showToast } = useToast();
  const { setTheme, theme } = useTheme();
  const { setPaletteId, clearPersonalPalette, setCompanyPaletteId } = useThemeController();

  const [user, setUser] = useState(null);
  // True once /auth/me answered 401: pages that wait on the user can send
  // the visitor to sign in instead of waiting forever.
  const [signedOut, setSignedOut] = useState(false);
  const [company, setCompany] = useState(null);
  const [mine, setMine] = useState({});
  const [defaults, setDefaults] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  const appliedThemeRef = useRef(false);

  const effective = useMemo(() => resolveEffective(defaults, mine), [defaults, mine]);
  const prefs = useMemo(() => withDefaults(effective), [effective]);

  const loadIdentity = useCallback(async () => {
    try {
      const data = await api("/auth/me");
      setUser(data.user || null);
      setSignedOut(false);
      setCompany(data.company || null);
      if (data.company?.slug) writeStoredCompanySlug(data.company.slug);
      if (data.company?.palette_id) setCompanyPaletteId(data.company.palette_id);
      return data;
    } catch (e) {
      if (e?.status === 401) setSignedOut(true);
      return null;
    }
  }, [setCompanyPaletteId]);

  const loadPrefs = useCallback(async () => {
    try {
      const data = await api("/me/preferences");
      setMine(data.preferences || {});
      setDefaults(data.defaults || {});
    } catch {
      /* stay on defaults; the shell still works */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
    loadPrefs();
  }, [loadIdentity, loadPrefs]);

  // A cookie that no longer names a live session (signed out elsewhere, the
  // account removed, the database reset) still gets past proxy.js, which only
  // checks that the cookie exists. Once /auth/me says 401, clear the cookie so
  // proxy.js stops sending /login back here, then go to sign in.
  const router = useRouter();
  useEffect(() => {
    if (!signedOut) return;
    let cancelled = false;
    api("/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [signedOut, router]);

  // Appearance: density and motion on <html>; theme and accent through the
  // existing theme controller, only when the person (or the company) chose.
  useEffect(() => {
    applyDocumentAppearance(prefs.appearance);
  }, [prefs.appearance]);

  useEffect(() => {
    if (!loaded) return;
    const chosenTheme = effective.appearance?.theme;
    if (chosenTheme && !appliedThemeRef.current && chosenTheme !== theme) {
      setTheme(chosenTheme);
    }
    appliedThemeRef.current = true;
    const palette = effective.appearance?.palette;
    if (palette) setPaletteId(palette);
    // A cleared palette goes back to the company look.
    if (effective.appearance && effective.appearance.palette === null) clearPersonalPalette();
    // Theme application is a one-time sync from the server per load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, effective.appearance?.palette, effective.appearance?.theme]);

  const flush = useCallback(async () => {
    const patch = pendingRef.current;
    pendingRef.current = null;
    timerRef.current = null;
    if (!patch) return;
    setSaving(true);
    try {
      const data = await api("/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setMine(data.preferences || {});
      setDefaults(data.defaults || {});
    } catch (error) {
      showToast(error?.message || "Could not save your workspace settings.");
      loadPrefs();
    } finally {
      setSaving(false);
    }
  }, [loadPrefs, showToast]);

  const updatePrefs = useCallback(
    (patch) => {
      setMine((current) => applyPatch(current, patch));
      pendingRef.current = pendingRef.current ? mergePatches(pendingRef.current, patch) : patch;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
      if (patch.appearance?.theme) setTheme(patch.appearance.theme);
      if (patch.appearance && "palette" in patch.appearance) {
        if (patch.appearance.palette) setPaletteId(patch.appearance.palette);
        else clearPersonalPalette();
      }
    },
    [flush, setTheme, setPaletteId, clearPersonalPalette],
  );

  // Never drop a pending save when the tab closes or the shell unmounts.
  useEffect(() => {
    function onHide() {
      if (pendingRef.current) flush();
    }
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      if (pendingRef.current) flush();
    };
  }, [flush]);

  const resetPrefs = useCallback(async () => {
    try {
      const data = await api("/me/preferences", { method: "DELETE" });
      setMine(data.preferences || {});
      setDefaults(data.defaults || {});
      clearPersonalPalette();
      showToast("Your workspace is back to the company defaults.");
    } catch (error) {
      showToast(error?.message || "Could not reset your workspace.");
    }
  }, [clearPersonalPalette, showToast]);

  const saveAsDefaults = useCallback(
    async (patch) => {
      const data = await api("/company/workspace-defaults", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setDefaults(data.defaults || {});
      return data.defaults;
    },
    [],
  );

  const pins = useMemo(() => prefs.nav?.pins || [], [prefs.nav?.pins]);
  const isPinned = useCallback(
    (kind, id) => pins.some((pin) => pin.id === pinKey(kind, id)),
    [pins],
  );
  const togglePin = useCallback(
    ({ kind, id, label, href }) => {
      const key = pinKey(kind, id);
      const exists = pins.some((pin) => pin.id === key);
      const next = exists
        ? pins.filter((pin) => pin.id !== key)
        : [{ id: key, kind, label: String(label || key).slice(0, 120), href }, ...pins].slice(0, 20);
      updatePrefs({ nav: { pins: next } });
      showToast(exists ? `Unpinned ${label}` : `Pinned ${label}`);
    },
    [pins, updatePrefs, showToast],
  );

  const value = useMemo(
    () => ({
      user,
      signedOut,
      company,
      setCompany,
      reloadIdentity: loadIdentity,
      role: user?.role || null,
      isAdmin: user?.role === "owner" || user?.role === "admin",
      prefs,
      mine,
      defaults,
      loaded,
      saving,
      updatePrefs,
      resetPrefs,
      saveAsDefaults,
      isPinned,
      togglePin,
    }),
    [
      user,
      signedOut,
      company,
      loadIdentity,
      prefs,
      mine,
      defaults,
      loaded,
      saving,
      updatePrefs,
      resetPrefs,
      saveAsDefaults,
      isPinned,
      togglePin,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside the app shell");
  return ctx;
}

/** For components that may render outside the shell (forms reused publicly). */
export function useOptionalWorkspace() {
  return useContext(WorkspaceContext);
}

export const DENSITY_STORAGE_KEY = DENSITY_KEY;
