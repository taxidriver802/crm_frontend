/**
 * Help is the user guide (crm_backend/docs/guide/using-the-crm.md), served
 * by GET /help. The frontend keeps no words of its own: only which article
 * answers which moment. crm_qa's help-source check reads this file and
 * fails if an id below is not an article in the guide.
 *
 * The open article lives in the URL (?help=record-a-payment), like peek, so
 * reload, back and a shared link restore it. `?help=contents` is the list.
 */

export const HELP_PARAM = "help";
export const HELP_CONTENTS = "contents";
export const HELP_EVENT = "crm-helpchange";

/** The job's next step → the one article for that moment. */
export const NEXT_STEP_ARTICLE = {
  schedule_visit: "schedule-an-appointment",
  create_estimate: "write-an-estimate",
  send_estimate: "send-an-estimate",
  await_client: "record-the-clients-answer",
  request_deposit: "request-a-deposit",
  send_invoice: "send-an-invoice",
  schedule_work: "schedule-the-work",
  start_work: "move-a-job-through-its-stages",
  complete_work: "move-a-job-through-its-stages",
  final_invoice: "create-the-final-invoice",
  collect_payment: "record-a-payment",
  close_job: "close-a-job",
};

/** The invoice's current action → its article. */
export const INVOICE_STEP_ARTICLE = {
  send_invoice: "send-an-invoice",
  record_payment: "record-a-payment",
};

/** An empty Today: the first-job walkthrough for those who can run it, otherwise Today itself. */
export const EMPTY_TODAY_ARTICLE = { admin: "start-here", agent: "use-today" };

export const START_HERE = "start-here";

const ID_RE = /^[a-z0-9-]{1,80}$/;

export function parseHelpParam(value) {
  const id = String(value || "");
  return ID_RE.test(id) ? id : null;
}

export function readHelpParam() {
  if (typeof window === "undefined") return null;
  return parseHelpParam(new URLSearchParams(window.location.search).get(HELP_PARAM));
}

export function writeHelpParam(id) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(HELP_PARAM, id);
  else url.searchParams.delete(HELP_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
  window.dispatchEvent(new Event(HELP_EVENT));
}

/** Lowercased haystack for matching a typed task against an article. */
export function helpHaystack(article) {
  return [article.title, article.group, ...(article.keywords || [])].filter(Boolean).join(" ").toLowerCase();
}

/** Articles that answer what was typed: every word must appear. */
export function matchHelp(articles, query) {
  const words = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return [];
  return articles.filter((article) => {
    const hay = helpHaystack(article);
    return words.every((word) => hay.includes(word));
  });
}
