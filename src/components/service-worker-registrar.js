"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    function register() {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (document.readyState === "complete") {
      register();
      return undefined;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
