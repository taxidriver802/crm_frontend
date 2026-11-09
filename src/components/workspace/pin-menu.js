"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { useMediaQuery } from "@/lib/use-media-query";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast/toast-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";

/**
 * Pin, with a menu for the second way to keep a record close:
 *   Pin to sidebar          — a shortcut in the rail (the button itself)
 *   Keep open beside pages  — the record stays open on the right while you
 *                             move between pages (wide screens)
 *
 * variant "button" for record headers, "icon" for panel headers.
 */
export function PinMenu({ kind, id, label, href, variant = "button", onDocked }) {
  const workspace = useWorkspace();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  // Phones have no room beside the page; the option only shows where it works.
  const canDock = useMediaQuery("(min-width: 768px)");

  const pinned = workspace.isPinned(kind, id);
  const docked = workspace.isDocked(kind, id);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function togglePin() {
    workspace.togglePin({ kind, id, label, href });
  }

  function toggleDock() {
    if (docked) {
      workspace.setDock(null);
      showToast(`${label} is no longer kept open.`);
      return;
    }
    const replacing = workspace.dock && workspace.dock.label;
    workspace.setDock({ kind, id, label, href });
    showToast(
      replacing
        ? `${label} is kept open beside your pages, in place of ${replacing}.`
        : `${label} is kept open beside your pages.`,
    );
    onDocked?.();
  }

  const icon = variant === "icon";
  const chevron = (
    <button
      type="button"
      className={icon ? "icon-btn icon-btn-quiet pin-menu-chevron" : "btn btn-sm pin-menu-chevron"}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="More ways to keep this close"
      title="More ways to keep this close"
      onClick={() => setOpen((o) => !o)}
    >
      <Icon name="chevronDown" className={cx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
    </button>
  );

  return (
    <div className={cx("pin-menu relative", icon ? "pin-menu-icon" : "pin-menu-button")} ref={rootRef}>
      {icon ? (
        <button
          type="button"
          className={cx("icon-btn icon-btn-quiet", pinned && "icon-btn-on")}
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin" : "Pin to sidebar"}
          title={pinned ? "Unpin" : "Pin to sidebar"}
          onClick={togglePin}
        >
          <Icon name="pin" className="h-4 w-4" />
        </button>
      ) : (
        <button type="button" className="btn btn-sm pin-menu-main" aria-pressed={pinned} onClick={togglePin}>
          <Icon name="pin" className="h-3.5 w-3.5" />
          {pinned ? "Pinned" : "Pin"}
        </button>
      )}
      {chevron}
      {open ? (
        <div
          role="menu"
          className="dropdown-panel absolute right-0 top-full z-50 mt-1 min-w-[15rem] overflow-hidden py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={pinned}
            className="pin-menu-item"
            onClick={() => {
              setOpen(false);
              togglePin();
            }}
          >
            <Icon name="pin" className="h-4 w-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block">Pin to sidebar</span>
              <span className="block text-xs text-muted">A shortcut in the rail</span>
            </span>
            {pinned ? <Icon name="check" className="h-4 w-4 shrink-0 text-accent" /> : null}
          </button>
          {canDock ? (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={docked}
              className="pin-menu-item"
              onClick={() => {
                setOpen(false);
                toggleDock();
              }}
            >
              <Icon name="panelRight" className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block">Keep open beside pages</span>
                <span className="block text-xs text-muted">Stays on the right as you move around</span>
              </span>
              {docked ? <Icon name="check" className="h-4 w-4 shrink-0 text-accent" /> : null}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
