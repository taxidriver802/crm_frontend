"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/helper";
import { cx } from "@/lib/cx";
import { announceChange } from "@/lib/record-events";
import { estimateNextStep } from "@/lib/documents";
import { formatMoney } from "@/lib/job-lifecycle";
import {
  buildEstimateShareMessage,
  copyText,
  firstNameFromLeadName,
  formatMessageAmount,
  logOutboundEmailOnJob,
} from "@/lib/message-templates";
import { useToast } from "@/components/toast/toast-provider";
import { NumberInput } from "@/components/ui/formatted-inputs";
import { Alert } from "@/components/ui/alert";
import { Eyebrow } from "@/components/records/record-bits";
import { Icon } from "@/components/icons";

async function tryCopy(text) {
  try {
    return await copyText(text);
  } catch {
    return false;
  }
}

/**
 * Every action an estimate offers. Sending is sharing (the client answers on
 * the link); approving moves the job to Sold on the server; billing creates
 * deposit and final invoices from the approved scope.
 */
export function useEstimateActions(estimate, onUpdated) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  function changed(next) {
    if (next) onUpdated?.(next);
    announceChange({ kind: "estimate", id: estimate.id, jobId: estimate.job_id });
  }

  async function run(key, fn) {
    setBusy(key);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e?.message || "That did not work. Try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function share(path, key, sentMessage) {
    return run(key, async () => {
      const res = await api(`/estimates/${estimate.id}/${path}`, { method: "POST" });
      const copied = await tryCopy(res.share_url);
      changed(res.estimate);
      showToast(copied ? sentMessage : `Copy the client's link: ${res.share_url}`, { tone: "success" });
      return res.estimate;
    });
  }

  return {
    busy,
    error,
    clearError: () => setError(""),

    send: () =>
      share(
        "share",
        "send",
        estimate.status === "Draft"
          ? "Link copied. The estimate is sent — the client answers on that link."
          : "New link copied. Any earlier link no longer works.",
      ),
    resend: () => share("resend", "resend", "New link copied. The old link no longer works."),

    copyMessage: () =>
      run("message", async () => {
        const res = await api(`/estimates/${estimate.id}/share`, { method: "POST" });
        const data = res.estimate || estimate;
        const message = buildEstimateShareMessage({
          first_name: firstNameFromLeadName(data?.job?.lead_name),
          job_title: data?.job?.title || "your job",
          amount: formatMessageAmount(data?.grand_total),
          due_date: "",
          link: res.share_url,
        });
        const copied = await tryCopy(message);
        let logged = true;
        try {
          await logOutboundEmailOnJob(data.job_id, message);
        } catch {
          logged = false;
        }
        changed(res.estimate);
        showToast(
          copied && logged
            ? "Message copied and logged on the job."
            : copied
              ? "Message copied. It could not be logged on the job."
              : "Message logged on the job — copy it from the conversation.",
          { tone: copied || logged ? "success" : "danger" },
        );
        return res.estimate;
      }),

    setStatus: (status, message) =>
      run(`status-${status}`, async () => {
        const res = await api(`/estimates/${estimate.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        changed(res.estimate);
        announceChange({ kind: "job", id: estimate.job_id });
        if (message) showToast(message, { tone: "success" });
        return res.estimate;
      }),

    bill: (body) =>
      run(body.kind === "deposit" ? "deposit" : "final", async () => {
        const res = await api(`/invoices/from-estimate/${estimate.id}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        announceChange({ kind: "invoice", id: res.invoice.id, jobId: res.invoice.job_id });
        changed(null);
        showToast(
          `${res.invoice.invoice_number} drafted for ${formatMoney(res.invoice.grand_total)}. Send it when it is right.`,
          { tone: "success" },
        );
        return res.invoice;
      }),

    changeOrder: () =>
      run("change", async () => {
        const res = await api(`/estimates/${estimate.id}/change-order`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        changed(null);
        return res.estimate;
      }),

    downloadPdf: () =>
      run("pdf", async () => {
        const res = await fetch(`${API_BASE}/estimates/${estimate.id}/pdf`, { credentials: "include" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Download failed (${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `estimate-${estimate.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      }),
  };
}

function DepositForm({ estimate, busy, onSubmit, onCancel }) {
  const [percent, setPercent] = useState("30");
  const amount = (Number(estimate.grand_total || 0) * Number(percent || 0)) / 100;
  return (
    <form
      className="doc-form flex-row flex-wrap items-end"
      data-testid="deposit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ kind: "deposit", deposit_percent: Number(percent) });
      }}
    >
      <label className="field-label block">
        Deposit %
        <NumberInput
          className="input mt-1 w-24"
          allowDecimal
          value={percent}
          onChange={(value) => setPercent(String(value))}
          aria-label="Deposit percent"
        />
      </label>
      <div className="num pb-2 text-sm text-muted">= {formatMoney(amount)}</div>
      <button
        type="submit"
        className="btn btn-primary btn-sm"
        disabled={busy || !(Number(percent) > 0 && Number(percent) <= 100)}
      >
        {busy ? "Creating…" : "Create deposit invoice"}
      </button>
      {onCancel ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  );
}

/**
 * The one thing to do with this estimate now. `onBilled(invoice)` decides
 * where a new invoice opens (the peek, beside where you are); `onAddScope`
 * is offered only where lines can be edited (the record).
 */
export function EstimateNextStep({
  estimate,
  actions,
  onBilled,
  onOpenInvoice,
  onAddScope,
  startDeposit = false,
  compact = false,
}) {
  const [depositOpen, setDepositOpen] = useState(startDeposit);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const step = estimateNextStep(estimate);
  if (!step) return null;
  const busy = !!actions.busy;

  async function bill(body) {
    const invoice = await actions.bill(body);
    if (invoice) {
      setDepositOpen(false);
      onBilled?.(invoice);
    }
  }

  let controls = null;
  switch (step.action) {
    case "add_scope":
      controls = onAddScope ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAddScope}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add a line
        </button>
      ) : (
        <Link href={`/estimates/${estimate.id}`} className="btn btn-primary btn-sm">
          Open to add lines
        </Link>
      );
      break;
    case "send_estimate":
      controls = (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={actions.send}>
            <Icon name="link" className="h-3.5 w-3.5" />
            {actions.busy === "send" ? "Sending…" : "Send — copy link"}
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={actions.copyMessage}>
            {actions.busy === "message" ? "Copying…" : "Copy message"}
          </button>
        </>
      );
      break;
    case "await_client":
      controls = confirmApprove ? (
        <>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={async () => {
              const next = await actions.setStatus("Approved", "Marked approved. The job is Sold.");
              if (next) setConfirmApprove(false);
            }}
          >
            {actions.busy === "status-Approved" ? "Saving…" : "Yes, they approved"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmApprove(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={actions.send}
            title="Copies a new link. Any earlier link stops working."
          >
            <Icon name="link" className="h-3.5 w-3.5" />
            Copy a new link
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setConfirmApprove(true)}>
            <Icon name="check" className="h-3.5 w-3.5" />
            Mark approved
          </button>
        </>
      );
      break;
    case "resend":
      controls = (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={actions.resend}>
          {actions.busy === "resend" ? "Working…" : "Resend — new link"}
        </button>
      );
      break;
    case "request_deposit":
      controls = depositOpen ? null : (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => setDepositOpen(true)}>
            Request deposit
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => bill({ kind: "final" })}>
            {actions.busy === "final" ? "Creating…" : "Bill it all now"}
          </button>
        </>
      );
      break;
    case "final_invoice":
      controls = (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => bill({ kind: "final" })}>
          {actions.busy === "final" ? "Creating…" : "Create final invoice"}
        </button>
      );
      break;
    case "open_invoice":
      controls = onOpenInvoice ? (
        <button type="button" className="btn btn-sm" onClick={() => onOpenInvoice(step.invoiceId)}>
          Open invoice
        </button>
      ) : null;
      break;
    default:
      controls = null;
  }

  const quiet = step.action === "open_invoice";
  return (
    <div
      className={cx("next-step", !compact && "next-step-row", quiet && "next-step-quiet")}
      data-testid="estimate-next-step"
    >
      <div className="min-w-0">
        <Eyebrow>{quiet ? "Billing" : "Next step"}</Eyebrow>
        <div className="font-medium">{step.label}</div>
        {step.detail ? <div className="text-sm text-muted">{step.detail}</div> : null}
      </div>
      {controls ? <div className="flex shrink-0 flex-wrap gap-2">{controls}</div> : null}
      {actions.error ? <Alert className="w-full">{actions.error}</Alert> : null}
      {step.action === "request_deposit" && depositOpen ? (
        <div className="w-full">
          <DepositForm
            estimate={estimate}
            busy={actions.busy === "deposit"}
            onSubmit={bill}
            onCancel={() => setDepositOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
