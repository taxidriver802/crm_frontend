"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { announceChange, touchesJob, useRecordChanges } from "@/lib/record-events";
import { isOpenInvoice } from "@/lib/documents";
import { formatMoney } from "@/lib/job-lifecycle";
import { usePeek } from "@/components/peek/peek-provider";
import { useToast } from "@/components/toast/toast-provider";
import { Alert } from "@/components/ui/alert";
import { Eyebrow } from "@/components/records/record-bits";
import { Icon } from "@/components/icons";

/** A job's estimates and invoices, kept current as they change anywhere on screen. */
export function useJobDocuments(jobId) {
  const [state, setState] = useState({ estimates: [], invoices: [], loaded: false });

  const fetchDocs = useCallback(
    () =>
      Promise.all([
        api(`/estimates/job/${jobId}`).catch(() => null),
        api(`/invoices/job/${jobId}`).catch(() => null),
      ]).then(([est, inv]) => ({
        estimates: est?.estimates || [],
        invoices: inv?.invoices || [],
        loaded: true,
      })),
    [jobId],
  );

  const load = useCallback(() => fetchDocs().then(setState), [fetchDocs]);

  useEffect(() => {
    if (jobId == null) return undefined;
    let alive = true;
    fetchDocs().then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [jobId, fetchDocs]);

  useRecordChanges((detail) => {
    if (touchesJob(detail, jobId)) load();
  });

  return { ...state, reload: load };
}

/**
 * The documents the job's next step is about. The backend names the step
 * from the job's money; this finds the estimate or invoice it means.
 */
export function pickJobDocuments(estimates = [], invoices = []) {
  const live = invoices.filter((inv) => inv.status !== "Void");
  const finalFor = (estimateId) =>
    live.some((inv) => String(inv.estimate_id) === String(estimateId) && inv.kind !== "deposit");
  const depositFor = (estimateId) =>
    live.some((inv) => String(inv.estimate_id) === String(estimateId) && inv.kind === "deposit");
  const byDue = (a, b) =>
    new Date(a.due_date || a.created_at) - new Date(b.due_date || b.created_at);
  const open = live.filter(isOpenInvoice).sort(byDue);
  return {
    draftEstimate: estimates.find((e) => e.status === "Draft" && !e.client_responded_at) ||
      estimates.find((e) => e.status === "Draft") ||
      null,
    sentEstimate: estimates.find((e) => e.status === "Sent") || null,
    depositEstimate:
      estimates.find((e) => e.status === "Approved" && !finalFor(e.id) && !depositFor(e.id)) || null,
    unbilledEstimate: estimates.find((e) => e.status === "Approved" && !finalFor(e.id)) || null,
    draftInvoice: live.find((inv) => inv.status === "Draft") || null,
    openInvoice: open.find((inv) => inv.status === "Overdue") || open[0] || null,
  };
}

/**
 * The job's one next step, with the control that does it. Document steps
 * open that document beside the job (a peek), already at the right action;
 * status steps move the job here. `onSchedule` opens scheduling in place;
 * without it the step links to the job's work tab with scheduling open.
 */
export function JobNextStep({ job, estimates, invoices, onSchedule, compact = false }) {
  const { openPeek } = usePeek();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blockers, setBlockers] = useState([]);
  const step = job?.next_step;
  if (!step || step.action === "none") return null;

  const docs = pickJobDocuments(estimates, invoices);

  async function moveTo(status) {
    setBusy(true);
    setError("");
    setBlockers([]);
    try {
      await api(`/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      announceChange({ kind: "job", id: job.id });
      showToast(`Moved to ${status}`, { tone: "success" });
    } catch (e) {
      setError(e?.message || "Could not move the job");
      setBlockers(Array.isArray(e?.data?.blockers) ? e.data.blockers : []);
    } finally {
      setBusy(false);
    }
  }

  async function billFinal(estimate) {
    setBusy(true);
    setError("");
    try {
      const res = await api(`/invoices/from-estimate/${estimate.id}`, {
        method: "POST",
        body: JSON.stringify({ kind: "final" }),
      });
      announceChange({ kind: "invoice", id: res.invoice.id, jobId: job.id });
      showToast(`${res.invoice.invoice_number} drafted for ${formatMoney(res.invoice.grand_total)}.`, {
        tone: "success",
      });
      openPeek("invoice", res.invoice.id);
    } catch (e) {
      setError(e?.message || "Could not create the invoice");
    } finally {
      setBusy(false);
    }
  }

  const primary = "btn btn-primary btn-sm";
  let control = null;
  switch (step.action) {
    case "schedule_visit":
    case "schedule_work":
      control = onSchedule ? (
        <button type="button" className={primary} onClick={onSchedule}>
          <Icon name="calendar" className="h-3.5 w-3.5" />
          Schedule
        </button>
      ) : (
        <Link href={`/jobs/${job.id}?tab=work&schedule=1`} className={primary}>
          <Icon name="calendar" className="h-3.5 w-3.5" />
          Schedule
        </Link>
      );
      break;
    case "create_estimate":
      control = (
        <Link href={`/estimates/new?job_id=${job.id}`} className={primary}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          New estimate
        </Link>
      );
      break;
    case "send_estimate":
      control = docs.draftEstimate ? (
        <button type="button" className={primary} onClick={() => openPeek("estimate", docs.draftEstimate.id)}>
          Send estimate
        </button>
      ) : null;
      break;
    case "await_client":
      control = docs.sentEstimate ? (
        <button type="button" className="btn btn-sm" onClick={() => openPeek("estimate", docs.sentEstimate.id)}>
          Open estimate
        </button>
      ) : null;
      break;
    case "request_deposit":
      control = docs.depositEstimate ? (
        <button
          type="button"
          className={primary}
          onClick={() => openPeek("estimate", docs.depositEstimate.id, { intent: "deposit" })}
        >
          Request deposit
        </button>
      ) : null;
      break;
    case "final_invoice":
      control = docs.unbilledEstimate ? (
        <button type="button" className={primary} disabled={busy} onClick={() => billFinal(docs.unbilledEstimate)}>
          {busy ? "Creating…" : "Create final invoice"}
        </button>
      ) : null;
      break;
    case "send_invoice":
      control = docs.draftInvoice ? (
        <button type="button" className={primary} onClick={() => openPeek("invoice", docs.draftInvoice.id)}>
          Send {docs.draftInvoice.invoice_number}
        </button>
      ) : null;
      break;
    case "collect_payment":
      control = docs.openInvoice ? (
        <button
          type="button"
          className={primary}
          onClick={() => openPeek("invoice", docs.openInvoice.id, { intent: "pay" })}
        >
          <Icon name="dollar" className="h-3.5 w-3.5" />
          Record payment
        </button>
      ) : null;
      break;
    case "start_work":
    case "complete_work":
    case "close_job":
      control = step.to_status ? (
        <button type="button" className={primary} disabled={busy} onClick={() => moveTo(step.to_status)}>
          {busy ? "Moving…" : `Move to ${step.to_status}`}
        </button>
      ) : null;
      break;
    default:
      control = null;
  }

  return (
    <div className={cx("next-step", !compact && "next-step-row")} data-testid="job-next-step">
      <div className="min-w-0">
        <Eyebrow>Next step</Eyebrow>
        <div className="font-medium">{step.label}</div>
        {step.detail ? <div className="text-sm text-muted">{step.detail}</div> : null}
      </div>
      {control ? <div className="flex shrink-0 flex-wrap gap-2">{control}</div> : null}
      {error ? (
        <Alert className="w-full">
          {error}
          {blockers.length > 0 ? (
            <ul className="mt-1 list-inside list-disc">
              {blockers.map((b, i) => (
                <li key={i}>{typeof b === "string" ? b : b.message || b.label}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
