"use client";

import { useEffect, useRef, useState } from "react";

/** Extra actions behind a compact "More" dropdown (used on task/lead detail toolbars). */
export function DetailMoreMenu({ label = "More", children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e) {
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className="btn flex items-center gap-1 px-3 py-1.5 text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span className="text-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="dropdown-panel absolute right-0 z-50 mt-1 min-w-[12rem] overflow-hidden py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Full-width row for Link or button inside DetailMoreMenu */
export function DetailMoreMenuItem({
  as: Component = "button",
  className = "",
  ...props
}) {
  const base =
    "hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left text-sm transition-colors";
  return (
    <Component role="menuitem" className={`${base} ${className}`.trim()} {...props} />
  );
}
