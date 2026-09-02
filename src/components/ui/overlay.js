"use client";

import { useEffect } from "react";
import { cx } from "@/lib/cx";

export const LAYER_Z = {
  overlay: "z-overlay",
  modal: "z-modal",
  palette: "z-palette",
  dialog: "z-dialog",
  lightbox: "z-lightbox",
};

export function Overlay({
  className = "",
  layer = "overlay",
  strong = false,
  onClick,
  children,
  as: As = "div",
  ...rest
}) {
  return (
    <As
      className={cx(
        "fixed inset-0",
        LAYER_Z[layer] || LAYER_Z.overlay,
        strong ? "bg-overlay-strong" : "bg-overlay",
        className,
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </As>
  );
}

export function ModalFrame({
  open,
  onClose,
  children,
  layer = "dialog",
  strong = false,
  labelledBy,
  label,
  panelClassName = "card relative w-full max-w-lg overflow-hidden rounded-2xl",
  className = "flex items-center justify-center p-4",
  lockScroll = true,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, lockScroll]);

  if (!open) return null;

  return (
    <div
      className={cx("fixed inset-0", LAYER_Z[layer] || LAYER_Z.dialog, className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Close"
        className={cx("absolute inset-0", strong ? "bg-overlay-strong" : "bg-overlay")}
        onClick={onClose}
      />
      <div className={cx("relative", panelClassName)}>{children}</div>
    </div>
  );
}
