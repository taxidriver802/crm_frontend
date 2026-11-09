"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { useMediaQuery } from "@/lib/use-media-query";
import { Icon } from "@/components/icons";
import { Eyebrow } from "@/components/records/record-bits";
import { usePeek } from "@/components/peek/peek-provider";
import { RecordPaneBody, recordPaneHeading, useRecordLoader } from "@/components/peek/peek-panel";
import { useWorkspace } from "@/components/workspace/workspace-provider";

/**
 * The one record kept open beside pages ("Keep open beside pages" in the
 * pin menu). On a wide screen it sits to the right of the page and the page
 * narrows to make room. When the window is too narrow for both, or the
 * person folds it, it becomes a tab on the right edge that slides the panel
 * over the page. Phones never show it.
 *
 * Which record is kept open follows the account (preferences); the width
 * and whether it is folded belong to this device.
 */

const WIDTH_KEY = "crm-dock-width";
const FOLDED_KEY = "crm-dock-folded";
const MIN_WIDTH = 360;
const DEFAULT_WIDTH = 440;
// The page never gets narrower than this to make room for the panel.
const MIN_PAGE = 760;

function readNumber(key, fallback) {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeValue(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    /* private mode */
  }
}

/** Room for the page and the panel: the shell's width less the rail. */
function useWorkspaceWidth() {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const shell = document.querySelector(".workbench");
    if (!shell) return undefined;
    function measure() {
      const rail = shell.querySelector(".rail");
      setWidth(shell.clientWidth - (rail ? rail.offsetWidth : 0));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    const rail = shell.querySelector(".rail");
    if (rail) observer.observe(rail);
    return () => observer.disconnect();
  }, []);
  return width;
}

export function DockPanel() {
  const { dock, setDock } = useWorkspace();
  const { intentFor, registerDock } = usePeek();
  const notPhone = useMediaQuery("(min-width: 768px)");
  const room = useWorkspaceWidth();

  // Read on the client only; the server renders nothing here (no dock yet).
  const [wanted, setWanted] = useState(() =>
    typeof window === "undefined" ? DEFAULT_WIDTH : readNumber(WIDTH_KEY, DEFAULT_WIDTH),
  );
  const [folded, setFolded] = useState(() =>
    typeof window === "undefined" ? false : readNumber(FOLDED_KEY, 0) === 1,
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const panelRef = useRef(null);

  const target = dock ? { kind: dock.kind, id: dock.id } : null;
  const key = target ? `${target.kind}:${target.id}` : null;
  const state = useRecordLoader(target, { onDeleted: () => setDock(null) });

  // The widest the panel may be and still leave the page its minimum.
  const maxWidth = Math.min(Math.round(room / 2), room - MIN_PAGE);
  const fits = notPhone && maxWidth >= MIN_WIDTH;
  const inline = Boolean(dock) && fits && !folded;
  const width = Math.max(MIN_WIDTH, Math.min(wanted, fits ? maxWidth : wanted));

  // Peeks float over the page, not over the panel kept open beside it.
  useEffect(() => {
    const root = document.documentElement;
    if (inline) root.style.setProperty("--dock-space", `${width}px`);
    else root.style.removeProperty("--dock-space");
    return () => root.style.removeProperty("--dock-space");
  }, [inline, width]);

  // A new record, or room coming back, starts with the overlay closed.
  const [seen, setSeen] = useState({ key, inline });
  if (seen.key !== key || seen.inline !== inline) {
    setSeen({ key, inline });
    setOverlayOpen(false);
  }

  const reveal = useCallback(() => {
    if (inline) {
      panelRef.current?.focus();
      return;
    }
    if (fits) {
      setFolded(false);
      writeValue(FOLDED_KEY, null);
    } else {
      setOverlayOpen(true);
    }
  }, [inline, fits]);

  useEffect(() => {
    if (!key || !notPhone) return undefined;
    return registerDock({ key, reveal });
  }, [key, notPhone, reveal, registerDock]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOverlayOpen(false);
    }
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  function fold() {
    if (inline) {
      setFolded(true);
      writeValue(FOLDED_KEY, 1);
    }
    setOverlayOpen(false);
  }

  function unfold() {
    if (fits) {
      setFolded(false);
      writeValue(FOLDED_KEY, null);
    } else {
      setOverlayOpen(true);
    }
  }

  // Drag the left edge to resize; the width is kept for this device.
  function startResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    let last = startWidth;
    const handle = event.currentTarget;
    handle.setPointerCapture?.(event.pointerId);
    document.documentElement.classList.add("is-resizing-dock");
    function onMove(e) {
      last = Math.max(MIN_WIDTH, Math.min(maxWidth, startWidth + (startX - e.clientX)));
      setWanted(last);
    }
    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      document.documentElement.classList.remove("is-resizing-dock");
      writeValue(WIDTH_KEY, Math.round(last));
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function nudge(event) {
    const step = event.shiftKey ? 64 : 16;
    let next = null;
    if (event.key === "ArrowLeft") next = width + step;
    if (event.key === "ArrowRight") next = width - step;
    if (next == null) return;
    event.preventDefault();
    next = Math.max(MIN_WIDTH, Math.min(maxWidth, next));
    setWanted(next);
    writeValue(WIDTH_KEY, next);
  }

  if (!dock || !notPhone) return null;

  const { eyebrow, title } = recordPaneHeading(dock.kind, state);
  const pending = intentFor(dock.kind, dock.id);

  const panel = (
    <aside
      ref={panelRef}
      tabIndex={-1}
      className={cx("dock-panel", inline ? "dock-inline" : "dock-overlay")}
      style={{ "--dock-w": `${width}px` }}
      aria-label={`${dock.label}, kept open`}
      data-testid="dock-panel"
    >
      {inline ? (
        <div
          className="dock-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the panel"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={maxWidth}
          aria-valuenow={Math.round(width)}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={nudge}
        />
      ) : null}
      <header className="peek-head">
        <div className="min-w-0">
          <Eyebrow>
            <span className="inline-flex items-center gap-1">
              <Icon name="panelRight" className="h-3 w-3" />
              Kept open · {eyebrow}
            </span>
          </Eyebrow>
          <h2 className="peek-title">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href={dock.href} className="icon-btn icon-btn-quiet" aria-label="Open full page" title="Open full page">
            <Icon name="arrowUpRight" className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="icon-btn icon-btn-quiet"
            aria-label="Fold to the edge"
            title="Fold to the edge"
            onClick={fold}
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-quiet"
            aria-label="Stop keeping this open"
            title="Stop keeping this open"
            onClick={() => setDock(null)}
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="peek-body">
        <RecordPaneBody
          kind={dock.kind}
          state={state}
          intent={pending?.intent || null}
          intentToken={pending?.token ?? null}
        />
      </div>
    </aside>
  );

  if (inline) return panel;

  return (
    <>
      {overlayOpen ? (
        <>
          <div className="peek-scrim dock-scrim" aria-hidden onClick={() => setOverlayOpen(false)} />
          {panel}
        </>
      ) : (
        <button
          type="button"
          className="dock-tab"
          onClick={unfold}
          aria-label={`Show ${dock.label}`}
          title={fits ? `Show ${dock.label} beside the page` : `Show ${dock.label}`}
          data-testid="dock-tab"
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          <span className="dock-tab-label">{dock.label}</span>
        </button>
      )}
    </>
  );
}
