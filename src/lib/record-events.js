"use client";

import { useEffect, useRef } from "react";

/**
 * Records change in more than one place at once: a payment recorded in a
 * peek changes the invoice, the job's money and its next step. Whoever makes
 * the change announces it; whatever is on screen underneath listens and
 * reloads, so the person sees the new state without leaving where they are.
 *
 * detail: { kind: "job"|"lead"|"task"|"estimate"|"invoice", id, jobId?, leadId? }
 */
const EVENT = "crm-recordchange";

export function announceChange(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

/** Calls `handler(detail)` for every announced change while mounted. */
export function useRecordChanges(handler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    function onChange(event) {
      ref.current?.(event.detail || {});
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
}

/** True when a change touches the given job (the job itself or one of its documents). */
export function touchesJob(detail, jobId) {
  if (!detail || jobId == null) return false;
  const id = String(jobId);
  if (detail.kind === "job" && String(detail.id) === id) return true;
  return detail.jobId != null && String(detail.jobId) === id;
}
