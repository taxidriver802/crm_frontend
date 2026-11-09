"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDate, formatTaskSchedule } from "@/lib/helper";
import { INVOICE_KIND_LABEL, formatMoney, phaseLabel, phaseOf } from "@/lib/job-lifecycle";
import { touchesJob, useRecordChanges } from "@/lib/record-events";
import { InvoiceNextStep, InvoiceTotals, PaymentLines, useInvoiceActions } from "@/components/documents/invoice-parts";
import { EstimateNextStep, useEstimateActions } from "@/components/documents/estimate-parts";
import { JobNextStep, useJobDocuments } from "@/components/jobs/job-next-step";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast/toast-provider";
import { useOptionalWorkspace } from "@/components/workspace/workspace-provider";
import { PinMenu } from "@/components/workspace/pin-menu";
import { PeekLink, recordHref, usePeek } from "./peek-provider";
import {
  ContactLinks,
  DetailList,
  Eyebrow,
  HealthDot,
  MoneyStrip,
  PhaseRail,
  QuickNotes,
  QuickTasks,
  RecordUnavailable,
  StatusPill,
} from "@/components/records/record-bits";

const KIND_LABEL = {
  job: "Job",
  lead: "Lead",
  task: "Task",
  invoice: "Invoice",
  estimate: "Estimate",
};

const LOADERS = {
  job: (id) => api(`/jobs/${id}`).then((r) => r.job),
  lead: (id) => api(`/leads/${id}`).then((r) => r.lead ?? r),
  task: (id) => api(`/tasks/${id}`).then((r) => r.task),
  invoice: (id) => api(`/invoices/${id}`).then((r) => r.invoice),
  estimate: (id) => api(`/estimates/${id}`).then((r) => r.estimate),
};

function titleFor(kind, record) {
  if (!record) return KIND_LABEL[kind];
  if (kind === "lead") return `${record.first_name || ""} ${record.last_name || ""}`.trim() || `Lead #${record.id}`;
  if (kind === "invoice") return record.invoice_number;
  return record.title || `${KIND_LABEL[kind]} #${record.id}`;
}

function Section({ title, children, right }) {
  return (
    <section className="peek-section">
      <div className="peek-section-head">
        <Eyebrow>{title}</Eyebrow>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function JobPeek({ job, reload }) {
  const docs = useJobDocuments(job.id);
  return (
    <>
      <div className="peek-summary">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill kind="job" status={job.status} />
          <HealthDot health={job.health} withLabel />
        </div>
        <PhaseRail status={job.status} />
        <ContactLinks address={job.address} />
        {job.lead ? (
          <p className="text-sm text-muted">
            Client{" "}
            <PeekLink kind="lead" id={job.lead.id} className="link">
              {job.lead.name}
            </PeekLink>
          </p>
        ) : null}
      </div>

      <JobNextStep job={job} estimates={docs.estimates} invoices={docs.invoices} compact />

      <Section title="Money">
        <MoneyStrip money={job.money} />
      </Section>

      <Section title="Open tasks">
        <QuickTasks entityType="job" entityId={job.id} limit={5} onChanged={reload} />
      </Section>

      <Section title="Conversation">
        <QuickNotes entityType="job" entityId={job.id} limit={3} />
      </Section>
    </>
  );
}

function LeadPeek({ lead }) {
  const [jobs, setJobs] = useState(null);
  useEffect(() => {
    let alive = true;
    api(`/jobs?leadId=${lead.id}&limit=20&offset=0&view=all`)
      .then((r) => alive && setJobs(r.jobs || []))
      .catch(() => alive && setJobs([]));
    return () => {
      alive = false;
    };
  }, [lead.id]);

  return (
    <>
      <div className="peek-summary">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill kind="lead" status={lead.status} />
          {lead.source ? <span className="tag">{lead.source}</span> : null}
          {lead.urgency ? <span className="tag">Urgency: {lead.urgency}</span> : null}
        </div>
        <ContactLinks phone={lead.phone} email={lead.email} />
        <DetailList
          items={[
            { label: "Service", value: lead.service_type },
            { label: "Prefers", value: lead.preferred_contact_method },
            {
              label: "Budget",
              value:
                lead.budget_min != null || lead.budget_max != null
                  ? `${lead.budget_min != null ? formatMoney(lead.budget_min) : "—"} – ${
                      lead.budget_max != null ? formatMoney(lead.budget_max) : "—"
                    }`
                  : null,
            },
          ]}
        />
        {lead.notes ? <p className="text-sm text-muted whitespace-pre-wrap">{lead.notes}</p> : null}
      </div>

      <Section
        title="Jobs"
        right={
          <Link href={`/jobs/new?lead_id=${lead.id}`} className="link text-xs">
            New job
          </Link>
        }
      >
        {jobs === null ? (
          <div className="skeleton h-8 w-full" />
        ) : jobs.length === 0 ? (
          <p className="px-1 text-sm text-muted">No jobs yet. A lead can wait here until there is work to quote.</p>
        ) : (
          <ul className="related-lines">
            {jobs.map((job) => (
              <li key={job.id}>
                <PeekLink kind="job" id={job.id} className="related-line">
                  <span className="truncate font-medium">{job.title}</span>
                  <StatusPill kind="job" status={job.status} />
                </PeekLink>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Open tasks">
        <QuickTasks entityType="lead" entityId={lead.id} limit={5} />
      </Section>

      <Section title="Conversation">
        <QuickNotes entityType="lead" entityId={lead.id} limit={3} />
      </Section>
    </>
  );
}

function TaskPeek({ task, setRecord }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const done = task.status === "Completed";

  async function toggle() {
    const next = done ? "Pending" : "Completed";
    setBusy(true);
    try {
      const res = await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setRecord(res.task);
      showToast(next === "Completed" ? "Task completed" : "Task reopened", { tone: "success" });
    } catch (e) {
      showToast(e?.message || "Could not update the task", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  const leadName = task.lead?.name || task.job_lead?.name;
  return (
    <>
      <div className="peek-summary">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill kind="task" status={task.status} />
          <span className="tag">{task.kind === "appointment" ? "Appointment" : "Task"}</span>
        </div>
        <DetailList
          items={[
            { label: task.kind === "appointment" ? "When" : "Due", value: formatTaskSchedule(task) },
            { label: "Where", value: task.location },
            {
              label: "Owner",
              value: task.assigned_user
                ? `${task.assigned_user.first_name || ""} ${task.assigned_user.last_name || ""}`.trim()
                : "Unassigned",
            },
          ]}
        />
        {task.description ? <p className="text-sm whitespace-pre-wrap">{task.description}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={cx("btn btn-sm", !done && "btn-primary")} disabled={busy} onClick={toggle}>
            <Icon name={done ? "undo" : "check"} className="h-3.5 w-3.5" />
            {done ? "Reopen" : "Mark complete"}
          </button>
          <Link href={`/tasks/${task.id}/edit`} className="btn btn-sm">
            Edit
          </Link>
        </div>
      </div>
      <Section title="Belongs to">
        <ul className="related-lines">
          {task.job_id ? (
            <li>
              <PeekLink kind="job" id={task.job_id} className="related-line">
                <span className="truncate font-medium">{task.job_title || `Job #${task.job_id}`}</span>
                {task.job_status ? <StatusPill kind="job" status={task.job_status} /> : null}
              </PeekLink>
            </li>
          ) : null}
          {task.lead_id || task.job_lead?.id ? (
            <li>
              <PeekLink kind="lead" id={task.lead_id || task.job_lead.id} className="related-line">
                <span className="truncate font-medium">{leadName || "Lead"}</span>
                <span className="text-xs text-muted">Lead</span>
              </PeekLink>
            </li>
          ) : null}
        </ul>
      </Section>
    </>
  );
}

function InvoicePeek({ invoice, setRecord, intent, intentToken }) {
  const actions = useInvoiceActions(invoice, setRecord);
  return (
    <>
      <div className="peek-summary">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill kind="invoice" status={invoice.status} />
          <span className="tag">{INVOICE_KIND_LABEL[invoice.kind] || "Invoice"}</span>
        </div>
        <div className="big-number num">{formatMoney(invoice.balance_due)}</div>
        <p className="-mt-2 text-sm text-muted">
          due of {formatMoney(invoice.grand_total)}
          {invoice.due_date ? ` · due ${formatDate(invoice.due_date)}` : ""}
        </p>
      </div>
      <InvoiceNextStep
        invoice={invoice}
        actions={actions}
        payRequest={intent === "pay" ? intentToken : null}
        compact
      />
      <Section title="Payments">
        <PaymentLines invoice={invoice} />
      </Section>
      <Section title="Totals">
        <InvoiceTotals invoice={invoice} />
      </Section>
      <Section title="Job">
        <PeekLink kind="job" id={invoice.job_id} className="related-line">
          <span className="truncate font-medium">{invoice.job?.title}</span>
          {invoice.job?.status ? <StatusPill kind="job" status={invoice.job.status} /> : null}
        </PeekLink>
      </Section>
    </>
  );
}

function EstimatePeek({ estimate, setRecord, intent, intentToken }) {
  const { openPeek } = usePeek();
  const actions = useEstimateActions(estimate, setRecord);
  return (
    <>
      <div className="peek-summary">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill kind="estimate" status={estimate.status} />
          {estimate.change_order_of ? <span className="tag">Change order</span> : null}
        </div>
        <div className="big-number num">{formatMoney(estimate.grand_total)}</div>
        <p className="-mt-2 text-sm text-muted">
          {(estimate.line_items || []).length} line items
          {estimate.approved_at ? ` · approved ${formatDate(estimate.approved_at)}` : ""}
        </p>
      </div>
      <EstimateNextStep
        estimate={estimate}
        actions={actions}
        depositRequest={intent === "deposit" ? intentToken : null}
        onBilled={(invoice) => openPeek("invoice", invoice.id)}
        onOpenInvoice={(invoiceId) => openPeek("invoice", invoiceId)}
        compact
      />
      <Section title="Scope">
        <ul className="related-lines">
          {(estimate.line_items || []).slice(0, 8).map((item) => (
            <li key={item.id} className="related-line">
              <span className="truncate">{item.name}</span>
              <span className="num">{formatMoney(item.line_total)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Job">
        <PeekLink kind="job" id={estimate.job_id} className="related-line">
          <span className="truncate font-medium">{estimate.job?.title}</span>
          {estimate.job?.status ? <StatusPill kind="job" status={estimate.job.status} /> : null}
        </PeekLink>
      </Section>
    </>
  );
}

const BODIES = {
  job: JobPeek,
  lead: LeadPeek,
  task: TaskPeek,
  invoice: InvoicePeek,
  estimate: EstimatePeek,
};

/* ------------------------------------------------------------------ */

/**
 * Loads one record for a panel (the peek, or the one kept open beside
 * pages) and keeps it current. The loaded record remembers which record it
 * belongs to: a slow reload of the one you just left (an estimate, after
 * billing its deposit) never fills the panel for the one you are on now.
 */
export function useRecordLoader(target, { onDeleted } = {}) {
  const key = target ? `${target.kind}:${target.id}` : null;
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  const [loadingKey, setLoadingKey] = useState(null);
  const currentKey = useRef(key);

  useEffect(() => {
    currentKey.current = key;
  }, [key]);

  const record = loaded && loaded.key === key ? loaded.data : null;
  const error = failed && failed.key === key ? failed.error : null;
  const loading = loadingKey != null && loadingKey === key;

  const setRecord = useCallback(
    (data) => {
      if (key && currentKey.current === key) setLoaded({ key, data });
    },
    [key],
  );

  const kind = target?.kind;
  const id = target?.id;
  const load = useCallback(async () => {
    if (!kind || id == null) return;
    const mine = `${kind}:${id}`;
    try {
      const data = await LOADERS[kind](id);
      if (currentKey.current !== mine) return;
      setLoaded({ key: mine, data });
      setFailed(null);
    } catch (e) {
      if (currentKey.current !== mine) return;
      setFailed({ key: mine, error: e });
      setLoaded(null);
    } finally {
      setLoadingKey((k) => (k === mine ? null : k));
    }
  }, [kind, id]);

  useEffect(() => {
    if (!key) {
      setLoaded(null);
      return;
    }
    currentKey.current = key;
    setLoadingKey(key);
    load();
  }, [key, load]);

  // Something changed this record elsewhere (the page underneath, another
  // panel): show the new state.
  useRecordChanges((detail) => {
    if (!kind) return;
    const same = detail.kind === kind && String(detail.id) === String(id);
    if (same && detail.deleted) {
      onDeleted?.();
      return;
    }
    if (same || (kind === "job" && touchesJob(detail, id))) load();
  });

  return { record, setRecord, error, loading, load };
}

/** The panel heading for a loaded (or loading) record. */
export function recordPaneHeading(kind, state) {
  const { record, loading, error } = state;
  return {
    eyebrow:
      kind === "job" && record ? `Job · ${phaseLabel(phaseOf(record.status))}` : KIND_LABEL[kind],
    title: loading ? "Loading…" : error ? KIND_LABEL[kind] : titleFor(kind, record),
    label: titleFor(kind, record),
  };
}

/** A record's panel contents: the summary, next step and related lines. */
export function RecordPaneBody({ kind, state, intent = null, intentToken = null }) {
  const { record, setRecord, error, loading, load } = state;
  if (error) {
    return <RecordUnavailable noun={KIND_LABEL[kind].toLowerCase()} error={error} onRetry={load} compact />;
  }
  if (loading || !record) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }
  const Body = BODIES[kind];
  return (
    <Body
      job={record}
      lead={record}
      task={record}
      invoice={record}
      estimate={record}
      setRecord={setRecord}
      reload={load}
      intent={intent}
      intentToken={intentToken}
    />
  );
}

export function PeekPanel() {
  const { peek, closePeek, intent, intentToken } = usePeek();
  const workspace = useOptionalWorkspace();
  const panelRef = useRef(null);
  const state = useRecordLoader(peek, { onDeleted: closePeek });

  useEffect(() => {
    if (!peek) return;
    function onKey(event) {
      if (event.key === "Escape") closePeek();
    }
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [peek, closePeek]);

  if (!peek) return null;

  const { eyebrow, title, label } = recordPaneHeading(peek.kind, state);
  const href = recordHref(peek.kind, peek.id);

  return (
    <>
      <div className="peek-scrim" aria-hidden onClick={closePeek} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="peek-panel"
        role="dialog"
        aria-modal="false"
        aria-label={`${KIND_LABEL[peek.kind]} preview`}
        data-testid="peek-panel"
      >
        <header className="peek-head">
          <div className="min-w-0">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="peek-title">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {workspace && state.record ? (
              <PinMenu
                variant="icon"
                kind={peek.kind}
                id={peek.id}
                label={label}
                href={href}
                // Kept open beside pages, it no longer needs the peek.
                onDocked={closePeek}
              />
            ) : null}
            <Link href={href} className="icon-btn icon-btn-quiet" aria-label="Open full page" title="Open full page">
              <Icon name="arrowUpRight" className="h-4 w-4" />
            </Link>
            <button type="button" className="icon-btn icon-btn-quiet" aria-label="Close preview" onClick={closePeek}>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="peek-body">
          <RecordPaneBody kind={peek.kind} state={state} intent={intent} intentToken={intentToken} />
        </div>
      </aside>
    </>
  );
}
