"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Peek: open any lead, job, task, estimate or invoice in a side panel without
 * leaving the list, board or home you are working from. The open record is
 * mirrored in the URL (?peek=job:12) so refresh and copy-link keep it.
 */

export const PEEK_KINDS = ["job", "lead", "task", "invoice", "estimate"];

const HREF = {
  job: (id) => `/jobs/${id}`,
  lead: (id) => `/leads/${id}`,
  task: (id) => `/tasks/${id}`,
  invoice: (id) => `/invoices/${id}`,
  estimate: (id) => `/estimates/${id}`,
};

export function recordHref(kind, id) {
  return HREF[kind] ? HREF[kind](id) : "/";
}

const PeekContext = createContext({
  peek: null,
  intent: null,
  intentToken: null,
  intentFor: () => null,
  openPeek: () => {},
  closePeek: () => {},
  registerDock: () => () => {},
});

function parsePeekParam(value) {
  const match = /^(job|lead|task|invoice|estimate):(\d+)$/.exec(String(value || ""));
  return match ? { kind: match[1], id: Number(match[2]) } : null;
}

const PEEK_EVENT = "crm-peekchange";

function writePeekParam(peek) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (peek) url.searchParams.set("peek", `${peek.kind}:${peek.id}`);
  else url.searchParams.delete("peek");
  window.history.replaceState(window.history.state, "", url.toString());
  window.dispatchEvent(new Event(PEEK_EVENT));
}

function subscribe(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(PEEK_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(PEEK_EVENT, callback);
  };
}

function readSearch() {
  return window.location.search;
}

function serverSearch() {
  return "";
}

export function PeekProvider({ children }) {
  // Re-render on navigation so a new page's URL is read.
  usePathname();
  // The URL is the source of truth: refresh, copy-link and back all agree.
  const search = useSyncExternalStore(subscribe, readSearch, serverSearch);
  const peek = useMemo(
    () => parsePeekParam(new URLSearchParams(search).get("peek")),
    [search],
  );

  // What the person opened the record to do ("pay", "send"), kept out of the
  // URL: a reload shows the record, not a half-filled form.
  const [pending, setPending] = useState(null);

  // The record kept open beside pages, if any. Opening that record again
  // (a link, Record payment on its job) goes to the side panel, not a peek.
  const dockRef = useRef(null);
  const registerDock = useCallback((entry) => {
    dockRef.current = entry;
    return () => {
      if (dockRef.current === entry) dockRef.current = null;
    };
  }, []);

  const openPeek = useCallback((kind, id, options = {}) => {
    if (!PEEK_KINDS.includes(kind) || !Number.isFinite(Number(id))) return;
    const key = `${kind}:${Number(id)}`;
    // A fresh token each time, so asking again for a record that is already
    // open (Record payment with the invoice beside the job) still reaches it.
    setPending(
      options.intent ? { key, intent: options.intent, token: Date.now() + Math.random() } : null,
    );
    if (dockRef.current?.key === key) {
      dockRef.current.reveal?.();
      return;
    }
    writePeekParam({ kind, id: Number(id) });
  }, []);

  const closePeek = useCallback(() => {
    setPending(null);
    writePeekParam(null);
  }, []);

  const intentFor = useCallback(
    (kind, id) => (pending && pending.key === `${kind}:${Number(id)}` ? pending : null),
    [pending],
  );

  const matches = peek && pending?.key === `${peek.kind}:${peek.id}`;
  const intent = matches ? pending.intent : null;
  const intentToken = matches ? pending.token : null;

  const value = useMemo(
    () => ({ peek, intent, intentToken, intentFor, openPeek, closePeek, registerDock }),
    [peek, intent, intentToken, intentFor, openPeek, closePeek, registerDock],
  );
  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}

export function usePeek() {
  return useContext(PeekContext);
}

/**
 * A link to a record that peeks on a plain click and behaves like a normal
 * link with a modifier (new tab, new window) or when peeking is unavailable.
 */
export function PeekLink({ kind, id, href, children, className, onClick, ...rest }) {
  const { openPeek } = usePeek();
  const target = href || recordHref(kind, id);
  return (
    <Link
      href={target}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openPeek(kind, id);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
