"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";

/**
 * A small popover menu.
 *
 *   <Menu trigger={(props) => <button {...props}>Open</button>} align="end">
 *     {(close) => <MenuItem onSelect={close}>…</MenuItem>}
 *   </Menu>
 *
 * Arrow keys move between items, Enter/Space activates, Escape and outside
 * clicks close. `open`/`onOpenChange` make it controllable (the create menu
 * opens from a keyboard shortcut).
 */
export function Menu({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  open: controlledOpen,
  onOpenChange,
  label,
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = useCallback(
    (next) => {
      if (onOpenChange) onOpenChange(next);
      if (controlledOpen === undefined) setUncontrolled(next);
    },
    [controlledOpen, onOpenChange],
  );
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]');
      first?.focus();
    });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, setOpen]);

  function onPanelKeyDown(event) {
    const items = Array.from(
      panelRef.current?.querySelectorAll('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]') || [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  }

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative inline-flex">
      {trigger({
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? id : undefined,
        onClick: () => setOpen(!open),
      })}
      {open ? (
        <div
          ref={panelRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className={cx(
            "menu-panel",
            align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            className,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ children, onSelect, icon, hint, danger, disabled, as: Comp = "button", ...rest }) {
  return (
    <Comp
      role="menuitem"
      tabIndex={-1}
      type={Comp === "button" ? "button" : undefined}
      disabled={disabled}
      className={cx("menu-item", danger && "menu-item-danger")}
      onClick={(event) => {
        if (disabled) return;
        onSelect?.(event);
      }}
      {...rest}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      {hint ? <span className="menu-hint">{hint}</span> : null}
    </Comp>
  );
}

export function MenuCheckbox({ children, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={-1}
      disabled={disabled}
      className="menu-item"
      onClick={() => onChange?.(!checked)}
    >
      <span className={cx("menu-check", checked && "menu-check-on")} aria-hidden>
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
    </button>
  );
}

export function MenuLabel({ children }) {
  return <div className="menu-label">{children}</div>;
}

export function MenuDivider() {
  return <div className="menu-divider" role="separator" />;
}
