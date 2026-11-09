"use client";

import { useSyncExternalStore } from "react";

/**
 * The search shortcut already listens for both the Command key and Ctrl.
 * The label follows the keyboard in front of the person. It is not a
 * preference: a Mac shows ⌘, everything else shows Ctrl.
 *
 * The server does not know which machine opened the page. The first paint
 * says ⌘, which matches this app's own machines, and a Windows browser
 * corrects it after hydration without a mismatch warning.
 */
function subscribe() {
  return () => {};
}

export function modKeyLabel() {
  if (typeof navigator === "undefined") return "Ctrl";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘" : "Ctrl";
}

export function useModKey() {
  return useSyncExternalStore(subscribe, modKeyLabel, () => "⌘");
}

/** "⌘K" on a Mac, "Ctrl+K" everywhere else. */
export function useModChord(key) {
  const mod = useModKey();
  return mod === "⌘" ? `${mod}${key}` : `${mod}+${key}`;
}
