/**
 * Job lifecycle vocabulary, mirrored from crm_backend/src/lib/jobLifecycle.ts.
 * The backend owns the rules (transitions, close gate, next step); this file
 * only names and groups the statuses so every screen reads them the same way.
 */

export const JOB_STATUSES = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Proposal Sent",
  "Sold",
  "Work Scheduled",
  "In Progress",
  "Work Complete",
  "Closed",
  "Lost",
];

export const JOB_PHASES = [
  {
    id: "selling",
    label: "Selling",
    short: "Sell",
    statuses: ["New", "Contacted", "Appointment Scheduled", "Proposal Sent"],
  },
  {
    id: "production",
    label: "Production",
    short: "Build",
    statuses: ["Sold", "Work Scheduled", "In Progress"],
  },
  {
    id: "billing",
    label: "Billing",
    short: "Bill",
    statuses: ["Work Complete"],
  },
  {
    id: "closed",
    label: "Closed",
    short: "Done",
    statuses: ["Closed"],
  },
  {
    id: "lost",
    label: "Lost",
    short: "Lost",
    statuses: ["Lost"],
  },
];

/** The forward path a job walks; Lost sits off to the side. */
export const JOB_PATH = JOB_STATUSES.filter((status) => status !== "Lost");

export const JOB_STATUS_SHORT = {
  New: "New",
  Contacted: "Touch",
  "Appointment Scheduled": "Visit",
  "Proposal Sent": "Sent",
  Sold: "Sold",
  "Work Scheduled": "Booked",
  "In Progress": "Active",
  "Work Complete": "Done",
  Closed: "Closed",
  Lost: "Lost",
};

const PHASE_BY_STATUS = Object.fromEntries(
  JOB_PHASES.flatMap((phase) => phase.statuses.map((status) => [status, phase.id])),
);

export function phaseOf(status) {
  return PHASE_BY_STATUS[status] || "selling";
}

export function phaseLabel(phaseId) {
  return JOB_PHASES.find((phase) => phase.id === phaseId)?.label || "Selling";
}

export function isTerminalStatus(status) {
  return status === "Closed" || status === "Lost";
}

export function formatMoney(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const PAYMENT_METHODS = [
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "ach", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "financing", label: "Financing" },
  { value: "other", label: "Other" },
];

export function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || "Payment";
}

export const INVOICE_KIND_LABEL = {
  standard: "Invoice",
  deposit: "Deposit",
  final: "Final invoice",
};
