/**
 * What happens next on an estimate or an invoice.
 *
 * The backend owns the state (estimate status and client response; invoice
 * status derived from the payments ledger and due date) and the job's next
 * step. These helpers only read that state and name the one action that
 * moves the document forward, so the record head, the peek and the job agree.
 */
import { formatDate } from "@/lib/helper";
import { formatMoney, phaseOf } from "@/lib/job-lifecycle";

export const OPEN_INVOICE_STATUSES = ["Sent", "Partially Paid", "Overdue"];

export function isOpenInvoice(invoice) {
  return OPEN_INVOICE_STATUSES.includes(invoice?.status);
}

export function invoiceNextStep(invoice) {
  if (!invoice) return null;
  const balance = Number(invoice.balance_due || 0);
  switch (invoice.status) {
    case "Draft":
      return {
        action: "send_invoice",
        label: "Send it to the client",
        detail:
          "A draft does not count toward what the client owes. Mark it sent, or copy its link — sharing sends it too.",
      };
    case "Sent":
    case "Partially Paid":
    case "Overdue":
      return {
        action: "record_payment",
        label:
          invoice.status === "Overdue"
            ? `Collect ${formatMoney(balance)} — past due`
            : `Collect ${formatMoney(balance)}`,
        detail: invoice.due_date
          ? `${invoice.status === "Overdue" ? "Was due" : "Due"} ${formatDate(invoice.due_date)}. Record each payment as it arrives.`
          : "Record each payment as it arrives. The balance and status follow the ledger.",
        tone: invoice.status === "Overdue" ? "danger" : null,
      };
    case "Paid":
      return {
        action: "none",
        label: "Paid in full",
        detail: invoice.paid_at ? `Settled ${formatDate(invoice.paid_at)}.` : null,
      };
    case "Void":
      return {
        action: "none",
        label: "Void",
        detail: "Kept on record. It does not count toward what the client owes.",
      };
    default:
      return null;
  }
}

/** Deposit and final invoices billed from an approved estimate (void ones excluded by the API). */
export function estimateBilling(estimate) {
  const invoices = estimate?.invoices || [];
  return {
    deposit: invoices.find((inv) => inv.kind === "deposit") || null,
    final: invoices.find((inv) => inv.kind !== "deposit") || null,
  };
}

export function estimateNextStep(estimate) {
  if (!estimate) return null;
  const lines = (estimate.line_items || []).length;
  const total = formatMoney(estimate.grand_total);
  switch (estimate.status) {
    case "Draft":
      if (lines === 0) {
        return {
          action: "add_scope",
          label: "Add the scope",
          detail: "Add line items or apply a template, then send it to the client.",
        };
      }
      if (estimate.client_responded_at) {
        return {
          action: "resend",
          label: "Revise and resend",
          detail: "The client asked for changes. Update the scope, then send a fresh link — the old one stops working.",
        };
      }
      return {
        action: "send_estimate",
        label: "Send it to the client",
        detail: `${total} for ${lines} line${lines === 1 ? "" : "s"}. Copying the share link sends it and moves the job to Proposal Sent.`,
      };
    case "Sent":
      return {
        action: "await_client",
        label: "Waiting on the client",
        detail: estimate.share_expires_at
          ? `The link is open until ${formatDate(estimate.share_expires_at)}. If they said yes another way, mark it approved.`
          : "If they said yes another way, mark it approved.",
      };
    case "Rejected":
      return {
        action: "resend",
        label: "Declined — revise and resend",
        detail: "Adjust the scope or the price, then send a fresh link. The old link stops working.",
      };
    case "Approved": {
      const { deposit, final } = estimateBilling(estimate);
      if (final) {
        return {
          action: "open_invoice",
          label: `Billed on ${final.invoice_number}`,
          detail: deposit ? `Deposit ${deposit.invoice_number} is subtracted on the final invoice.` : null,
          invoiceId: final.id,
        };
      }
      const inBilling = phaseOf(estimate.job?.status) === "billing";
      if (deposit || inBilling) {
        return {
          action: "final_invoice",
          label: inBilling ? "Send the final invoice" : "Bill the rest when the work is done",
          detail: deposit
            ? `Deposit ${deposit.invoice_number} is already billed; the final invoice subtracts it.`
            : `${total} approved and not invoiced.`,
        };
      }
      return {
        action: "request_deposit",
        label: "Approved — request a deposit",
        detail: `${total} agreed. Bill a deposit now, or bill it all at the end.`,
      };
    }
    default:
      return null;
  }
}
