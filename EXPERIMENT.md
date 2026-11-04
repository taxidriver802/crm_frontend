# Experiment `experiment/CC_expansion` — frontend changes

The full decision log (thesis, alternatives, verification, blockers) is in
[`crm_backend/docs/EXPERIMENT.md`](../crm_backend/docs/EXPERIMENT.md).

Thesis in one line: the job is the work hub, but its lifecycle used to end at
"Closed Won". The job now runs from first contact to paid and closed, and
its money is a payments ledger. This repo shows that on screen.

What changed here:

- `src/lib/job-lifecycle.js`: the frontend copy of the backend lifecycle
  vocabulary (statuses, phases, short labels, payment methods, invoice
  kinds, money formatting). It replaces the hardcoded job status lists in
  the jobs page, job detail, job form and status tones.
- `src/components/jobs/job-lifecycle.js`: the Lifecycle card on job detail,
  grouped by phase, with the server-computed next step and its action,
  milestones, Mark lost / Reopen, and close-gate blockers.
- `src/components/jobs/job-money.js`: the Money card on job detail. Shows
  contract, invoiced, collected, balance due and unbilled work, plus deposit
  and final invoices from approved estimates and the job's invoices.
- `src/components/invoices/invoice-payments.js` + `src/app/invoices/[id]`:
  the payments ledger, Mark sent, Void, totals with deposit billed and
  balance due, and line items that lock once money is in.
- `src/app/invoices/page.js`, `components/lists/invoices-list.js`: an Open
  filter, a balance column, and outstanding money in the header.
- `src/app/jobs/page.js`, `components/lists/jobs-list.js`: a phase filter
  with counts (exact-status deep links still work) and contract / owed on
  each row.
- `src/app/estimates/[id]/page.js`: approved scope locked, Add change order,
  deposit and final invoice actions, "Open INV-xxxx" once billed.
- `src/app/public/invoice/[token]/page.js` (new): the page the existing
  invoice share link always pointed at.
- `src/app/public/portal/[token]/page.js`: client-facing stage steps,
  payments and balance, invoice PDFs, drafts no longer shown (filtered by
  the API).
- `src/app/dashboard/page.js`, `components/dashboard/*`: an "Owed to you"
  metric, and ready-to-bill / sold-not-scheduled items in the queue.
- `src/app/reports/page.js`: "Money after the sale" (outstanding, past due,
  collected this month, AR aging, signed/billed/collected by month).
- `src/lib/activity.js`, `src/lib/status-tones.js`: payment and void activity
  types, automatic-move labels, and tones for the new statuses.
- `src/app/jobs/[id]/edit/page.js`, `components/forms/job-form.js`: lifecycle
  options, close-gate blockers shown on save.

`npm run lint` gives the same result as on `main`: 6 pre-existing problems,
none in files touched here.
