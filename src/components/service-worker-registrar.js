"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicCustomerPath } from "@/theme/public-path";

export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    if (isPublicCustomerPath(pathname)) return undefined;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;

    function onControllerChange() {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    function register() {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
    }

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", register);
    };
  }, [pathname]);

  return null;
}
