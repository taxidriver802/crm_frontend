"use client";

import { useEffect } from "react";

/**
 * List filters live in the URL so a reload, a shared link, the back button
 * and a pinned view all land on the same rows. Pages keep their filters in
 * state (inputs stay responsive) and this mirrors them into the query
 * string with replaceState, which Next's router picks up. (Passing Next's
 * own history state makes the router treat the call as internal and skip
 * syncing useSearchParams, so the state argument is null.)
 *
 *   useUrlFilterSync({ q, phase, scope }, { q: "", phase: "", scope: "mine" })
 *
 * A value equal to its default is left out of the URL. Other params (tab,
 * peek, view, lead_id…) are kept.
 */
export function useUrlFilterSync(values, defaults) {
  const serialized = JSON.stringify(values);
  const defaultsKey = JSON.stringify(defaults);
  useEffect(() => {
    const current = JSON.parse(serialized);
    const base = JSON.parse(defaultsKey);
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of Object.keys(base)) {
      const raw = current[key];
      const value = raw == null ? "" : String(raw).trim();
      const fallback = base[key] == null ? "" : String(base[key]);
      const existing = url.searchParams.get(key);
      if (!value || value === fallback) {
        if (existing !== null) {
          url.searchParams.delete(key);
          changed = true;
        }
      } else if (existing !== value) {
        url.searchParams.set(key, value);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, "", url.toString());
  }, [serialized, defaultsKey]);
}

/** Reads one filter from search params, falling back when missing or not allowed. */
export function readParam(searchParams, key, fallback = "", allowed = null) {
  const value = searchParams?.get(key);
  if (value == null || value === "") return fallback;
  if (allowed && !allowed.includes(value)) return fallback;
  return value;
}

/** True when two saved-filter objects pick the same rows (missing and "" are equal). */
export function sameFilters(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    const left = a?.[key] == null ? "" : String(a[key]);
    const right = b?.[key] == null ? "" : String(b[key]);
    if (left !== right) return false;
  }
  return true;
}
