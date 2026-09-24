"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export const INSTALL_DISMISS_KEY = "crm-install-dismissed";

const listeners = new Set();

function emitInstallChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = window.navigator.standalone === true;
  return Boolean(displayMode || iosStandalone);
}

/** iOS Safari only. Chrome/Firefox/Edge on iOS use their own install UI. */
export function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && !otherBrowser;
}

export function isInstallDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
  emitInstallChange();
}

export function usePwaInstall() {
  const installed = useSyncExternalStore(subscribe, isStandalone, () => false);
  const dismissed = useSyncExternalStore(subscribe, isInstallDismissed, () => true);
  const iosSafari = useSyncExternalStore(subscribe, isIosSafari, () => false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    function onPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function onInstalled() {
      setDeferredPrompt(null);
      emitInstallChange();
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    if (choice?.outcome === "accepted") emitInstallChange();
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    dismissInstallPrompt();
    setDeferredPrompt(null);
  }, []);

  return {
    canInstall: Boolean(deferredPrompt) && !installed && !dismissed,
    showIosHint: iosSafari && !installed && !dismissed,
    installed,
    promptInstall,
    dismiss,
  };
}
