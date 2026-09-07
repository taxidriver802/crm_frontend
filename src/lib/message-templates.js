import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";

export const MESSAGE_TEMPLATES = {
  estimateShare: `Hi {first_name},

Here's your estimate for {job_title}:
{link}

Please take a look and let me know if you have any questions.

Thanks`,
  invoiceReminder: `Hi {first_name},

Your invoice for {job_title} is ready. Amount due: {amount}. Due {due_date}.

View it here:
{link}

Thanks`,
  portalLink: `Hi {first_name},

You can view your job details and documents here:
{link}

Thanks`,
};

export function interpolateTemplate(template, vars = {}) {
  return String(template).replace(/\{([a-z_]+)\}/gi, (_, key) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

export function firstNameFromLeadName(leadName, fallback = "there") {
  const name = String(leadName || "").trim();
  if (!name || /^Lead #\d+$/i.test(name)) return fallback;
  return name.split(/\s+/)[0];
}

export function formatMessageAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function buildEstimateShareMessage(vars) {
  return interpolateTemplate(MESSAGE_TEMPLATES.estimateShare, vars);
}

export function buildInvoiceReminderMessage(vars) {
  return interpolateTemplate(MESSAGE_TEMPLATES.invoiceReminder, vars);
}

export function buildPortalLinkMessage(vars) {
  return interpolateTemplate(MESSAGE_TEMPLATES.portalLink, vars);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export async function logOutboundEmailOnJob(jobId, body) {
  return api("/notes", {
    method: "POST",
    body: JSON.stringify({
      entity_type: "job",
      entity_id: Number(jobId),
      type: "email",
      direction: "outbound",
      body,
    }),
  });
}

export function dueDateLabel(value) {
  if (!value) return "";
  const formatted = formatDate(value);
  return formatted === "—" ? "" : formatted;
}
