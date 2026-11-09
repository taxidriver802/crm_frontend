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

function InvoicePeek({ invoice, setRecord, intent }) {
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
      <InvoiceNextStep invoice={invoice} actions={actions} startPaying={intent === "pay"} compact />
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

function EstimatePeek({ estimate, setRecord, intent }) {
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
        startDeposit={intent === "deposit"}
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

export function PeekPanel() {
  const { peek, closePeek, intent } = usePeek();
  const workspace = useOptionalWorkspace();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    if (!peek) return;
    try {
      const data = await LOADERS[peek.kind](peek.id);
      setRecord(data);
      setError(null);
    } catch (e) {
      setError(e);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [peek]);

  useEffect(() => {
    if (!peek) {
      setRecord(null);
      return;
    }
    setLoading(true);
    setRecord(null);
    load();
  }, [peek, load]);

  // Something changed this record elsewhere (the page underneath, another
  // peek): show the new state. A deleted record closes the peek.
  useRecordChanges((detail) => {
    if (!peek) return;
    const same = detail.kind === peek.kind && String(detail.id) === String(peek.id);
    if (same && detail.deleted) {
      closePeek();
      return;
    }
    if (same || (peek.kind === "job" && touchesJob(detail, peek.id))) load();
  });

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

  const Body = BODIES[peek.kind];
  const title = titleFor(peek.kind, record);
  const href = recordHref(peek.kind, peek.id);
  const pinned = workspace?.isPinned(peek.kind, peek.id);
  const eyebrow =
    peek.kind === "job" && record
      ? `Job · ${phaseLabel(phaseOf(record.status))}`
      : KIND_LABEL[peek.kind];

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
            <h2 className="peek-title">{loading ? "Loading…" : error ? KIND_LABEL[peek.kind] : title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {workspace && record ? (
              <button
                type="button"
                className={cx("icon-btn icon-btn-quiet", pinned && "icon-btn-on")}
                aria-pressed={Boolean(pinned)}
                aria-label={pinned ? "Unpin" : "Pin to sidebar"}
                title={pinned ? "Unpin" : "Pin to sidebar"}
                onClick={() =>
                  workspace.togglePin({ kind: peek.kind, id: peek.id, label: title, href })
                }
              >
                <Icon name="pin" className="h-4 w-4" />
              </button>
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
          {error ? (
            <RecordUnavailable noun={KIND_LABEL[peek.kind].toLowerCase()} error={error} onRetry={load} compact />
          ) : loading || !record ? (
            <div className="space-y-3">
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-24 w-full" />
            </div>
          ) : (
            <Body
              job={record}
              lead={record}
              task={record}
              invoice={record}
              estimate={record}
              setRecord={setRecord}
              reload={load}
              intent={intent}
            />
          )}
        </div>
      </aside>
    </>
  );
}
