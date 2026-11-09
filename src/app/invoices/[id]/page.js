"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";
import { Field, FormActions } from "@/components/ui/field";
import { CurrencyInput, NumberInput } from "@/components/ui/formatted-inputs";
import { Alert } from "@/components/ui/alert";
import { Menu, MenuDivider, MenuItem } from "@/components/ui/menu";
import { Icon } from "@/components/icons";
import { PeekLink } from "@/components/peek/peek-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { DetailList, RecordUnavailable, StatusPill } from "@/components/records/record-bits";
import { RailPanel, TabPanel, Tabs, useRecordSections, useUrlTab } from "@/components/records/record-layout";
import {
  InvoiceNextStep,
  InvoiceTotals,
  PaymentLines,
  useInvoiceActions,
} from "@/components/documents/invoice-parts";
import { INVOICE_KIND_LABEL, formatMoney } from "@/lib/job-lifecycle";
import { announceChange, useRecordChanges } from "@/lib/record-events";

const TABS = ["payments", "lines"];

function emptyLine() {
  return { name: "", description: "", quantity: 1, unit_price: 0 };
}

function LineForm({ form, onChange, onSubmit, saving, onCancel, onDelete, editing }) {
  return (
    <form onSubmit={onSubmit} className="doc-form" data-testid="invoice-line-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required>
          <input
            className="input"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Line item name"
            required
          />
        </Field>
        <Field label="Description">
          <input
            className="input"
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <Field label="Quantity">
          <NumberInput
            allowDecimal
            value={form.quantity}
            onChange={(value) => onChange({ ...form, quantity: value })}
          />
        </Field>
        <Field label="Unit price">
          <CurrencyInput
            cents
            placeholder="$0.00"
            value={form.unit_price}
            onChange={(value) => onChange({ ...form, unit_price: value })}
          />
        </Field>
      </div>
      <FormActions>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Saving…" : editing ? "Update line" : "Add line"}
        </button>
        {editing ? (
          <button type="button" className="btn btn-danger btn-sm" disabled={saving} onClick={onDelete}>
            Delete
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </FormActions>
    </form>
  );
}

/** Why the lines cannot change, in the words the server uses. */
function lockReason(invoice) {
  if (invoice.status === "Void") return "This invoice is void, so its lines are kept as they were.";
  if (invoice.applied_on) {
    return `${invoice.applied_on} already subtracts this deposit, so its lines are locked. Void ${invoice.applied_on} first if the deposit has to change.`;
  }
  if (invoice.amount_paid > 0) {
    return "Payments are recorded, so the lines are locked. Remove the payments, or void and reissue.";
  }
  return null;
}

export default function InvoiceRecordPage() {
  const { id } = useParams();
  const router = useRouter();
  const workspace = useWorkspace();
  const { askConfirm, confirmModal } = useConfirmModal();
  const [tab, setTab] = useUrlTab("payments", TABS);
  const layout = useRecordSections("invoice", []);

  const [invoice, setInvoice] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lineForm, setLineForm] = useState(null);
  const [editingLine, setEditingLine] = useState(null);
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api(`/invoices/${id}`);
      setInvoice(res.invoice);
      setLoadError(null);
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Offer QuickBooks sync only when this person has QuickBooks connected.
  const [qbConnected, setQbConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    api("/integrations/quickbooks/status")
      .then((res) => {
        if (alive) setQbConnected(Boolean(res?.integration?.connected));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // A payment recorded in a peek, or a void from the job, shows up here too.
  useRecordChanges((detail) => {
    if (detail.kind === "invoice" && String(detail.id) === String(id) && !detail.deleted) load();
  });

  const actions = useInvoiceActions(invoice || { id, job_id: null }, setInvoice);

  if (loading && !invoice) {
    return (
      <AppShell title="Invoice">
        <div className="space-y-4" aria-busy="true">
          <div className="skeleton h-40 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="Invoice">
        <RecordUnavailable
          noun="invoice"
          error={loadError}
          listHref="/invoices"
          listLabel="Invoices"
          onRetry={load}
        />
      </AppShell>
    );
  }

  const isAdmin = workspace.isAdmin;
  const locked = invoice.locked;
  const payments = invoice.payments || [];
  const canVoid = invoice.status !== "Void" && payments.length === 0 && !invoice.applied_on;
  const canDelete = payments.length === 0 && !invoice.applied_on;
  const pinned = workspace.isPinned("invoice", invoice.id);

  function confirmVoid() {
    askConfirm({
      title: `Void ${invoice.invoice_number}?`,
      description:
        "It stays on record but stops counting toward what the client owes, on the job, in the list and on the portal.",
      confirmLabel: "Void invoice",
      tone: "danger",
      onConfirm: () => actions.voidInvoice(),
    });
  }

  function confirmDelete() {
    askConfirm({
      title: `Delete ${invoice.invoice_number}?`,
      description: "This cannot be undone. Void it instead if the client has seen it.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        const ok = await actions.deleteInvoice();
        if (ok) router.push(`/jobs/${invoice.job_id}?tab=money`);
      },
    });
  }

  function confirmRemovePayment(payment) {
    askConfirm({
      title: `Remove the ${formatMoney(payment.amount)} payment?`,
      description: "Use this to correct a mistake. The balance goes back up, and a closed job reopens.",
      confirmLabel: "Remove payment",
      tone: "danger",
      onConfirm: () => actions.removePayment(payment),
    });
  }

  async function saveLine(event) {
    event.preventDefault();
    setLineBusy(true);
    setLineError("");
    try {
      const path = editingLine
        ? `/invoices/${invoice.id}/line-items/${editingLine.id}`
        : `/invoices/${invoice.id}/line-items`;
      const res = await api(path, {
        method: editingLine ? "PATCH" : "POST",
        body: JSON.stringify({ ...lineForm, quantity: Number(lineForm.quantity) || 1 }),
      });
      setInvoice(res.invoice);
      setLineForm(null);
      setEditingLine(null);
      announceChange({ kind: "invoice", id: invoice.id, jobId: invoice.job_id });
    } catch (e) {
      setLineError(e?.message || "Could not save the line");
    } finally {
      setLineBusy(false);
    }
  }

  function deleteLine() {
    if (!editingLine) return;
    askConfirm({
      title: "Delete this line?",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/invoices/${invoice.id}/line-items/${editingLine.id}`, { method: "DELETE" });
          setLineForm(null);
          setEditingLine(null);
          await load();
          announceChange({ kind: "invoice", id: invoice.id, jobId: invoice.job_id });
        } catch (e) {
          setLineError(e?.message || "Could not delete the line");
        }
      },
    });
  }

  const reason = lockReason(invoice);
  const lines = invoice.line_items || [];

  return (
    <AppShell title={invoice.invoice_number} description={invoice.job?.title || undefined}>
      <div className="min-w-0 space-y-4">
        <section className="record-head" data-testid="invoice-head">
          <div className="record-head-top">
            <div className="min-w-0 space-y-2">
              <div className="record-meta">
                <StatusPill kind="invoice" status={invoice.status} />
                <span className="tag">{INVOICE_KIND_LABEL[invoice.kind] || "Invoice"}</span>
                <span>
                  Job{" "}
                  <PeekLink kind="job" id={invoice.job_id} className="link">
                    {invoice.job?.title || `Job #${invoice.job_id}`}
                  </PeekLink>
                </span>
                {invoice.job?.lead_id ? (
                  <span>
                    Client{" "}
                    <PeekLink kind="lead" id={invoice.job.lead_id} className="link">
                      {invoice.job.lead_name}
                    </PeekLink>
                  </span>
                ) : null}
                {invoice.estimate_id ? (
                  <span>
                    From{" "}
                    <PeekLink kind="estimate" id={invoice.estimate_id} className="link">
                      {invoice.estimate_title || `Estimate #${invoice.estimate_id}`}
                    </PeekLink>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="big-number num">{formatMoney(invoice.balance_due)}</span>
                <span className="text-sm text-muted">
                  due of {formatMoney(invoice.grand_total)}
                  {invoice.due_date ? ` · due ${formatDate(invoice.due_date)}` : " · no due date"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                aria-pressed={pinned}
                onClick={() =>
                  workspace.togglePin({
                    kind: "invoice",
                    id: invoice.id,
                    label: invoice.invoice_number,
                    href: `/invoices/${invoice.id}`,
                  })
                }
              >
                <Icon name="pin" className="h-3.5 w-3.5" />
                {pinned ? "Pinned" : "Pin"}
              </button>
              <Menu
                align="end"
                label="Invoice actions"
                className="w-60"
                trigger={(props) => (
                  <button type="button" {...props} className="btn btn-sm" aria-label="More invoice actions">
                    More
                    <Icon name="chevronDown" className="h-3.5 w-3.5" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Icon name="download" className="h-4 w-4 text-muted" />}
                      onSelect={() => {
                        close();
                        actions.downloadPdf();
                      }}
                    >
                      Download PDF
                    </MenuItem>
                    {invoice.status !== "Void" ? (
                      <>
                        <MenuItem
                          icon={<Icon name="link" className="h-4 w-4 text-muted" />}
                          onSelect={() => {
                            close();
                            actions.copyLink();
                          }}
                        >
                          {invoice.status === "Draft" ? "Copy link (sends it)" : "Copy client link"}
                        </MenuItem>
                        <MenuItem
                          icon={<Icon name="mail" className="h-4 w-4 text-muted" />}
                          onSelect={() => {
                            close();
                            actions.copyMessage();
                          }}
                        >
                          Copy reminder message
                        </MenuItem>
                      </>
                    ) : null}
                    {qbConnected ? (
                      <MenuItem
                        icon={<Icon name="plug" className="h-4 w-4 text-muted" />}
                        onSelect={() => {
                          close();
                          actions.syncQuickBooks();
                        }}
                      >
                        Sync to QuickBooks
                      </MenuItem>
                    ) : null}
                    {canVoid || canDelete ? <MenuDivider /> : null}
                    {canVoid ? (
                      <MenuItem
                        danger
                        onSelect={() => {
                          close();
                          confirmVoid();
                        }}
                      >
                        Void invoice
                      </MenuItem>
                    ) : null}
                    {canDelete ? (
                      <MenuItem
                        danger
                        onSelect={() => {
                          close();
                          confirmDelete();
                        }}
                      >
                        Delete invoice
                      </MenuItem>
                    ) : null}
                  </>
                )}
              </Menu>
              <button
                type="button"
                className="btn btn-sm btn-ghost hidden xl:inline-flex"
                onClick={() => layout.setRailVisible(!layout.railVisible)}
                aria-pressed={layout.railVisible}
                title={layout.railVisible ? "Hide the details panel" : "Show the details panel"}
              >
                <Icon name="panelLeft" className="h-3.5 w-3.5 rotate-180" />
                Details
              </button>
            </div>
          </div>
          <InvoiceNextStep invoice={invoice} actions={actions} />
        </section>

        <div className={layout.railVisible ? "record-grid" : "record-grid record-grid-norail"}>
          <div className="record-main">
            <Tabs
              label="Invoice sections"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "payments", label: "Payments", count: payments.length },
                { id: "lines", label: "Line items", count: lines.length },
              ]}
            />

            <TabPanel id="payments" active={tab === "payments"}>
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Payments</h2>
                  <span className="text-sm text-muted num">
                    {formatMoney(invoice.amount_paid)} paid · {formatMoney(invoice.balance_due)} due
                  </span>
                </div>
                <div className="panel-body">
                  <PaymentLines
                    invoice={invoice}
                    canRemove={isAdmin}
                    busy={!!actions.busy}
                    onRemove={confirmRemovePayment}
                  />
                  {!isAdmin && payments.length > 0 ? (
                    <p className="mt-3 text-xs text-muted">
                      Only an owner or admin can remove a recorded payment.
                    </p>
                  ) : null}
                </div>
              </section>
            </TabPanel>

            <TabPanel id="lines" active={tab === "lines"}>
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Line items</h2>
                  {!locked && !lineForm ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setEditingLine(null);
                        setLineForm(emptyLine());
                        setLineError("");
                      }}
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      Add line
                    </button>
                  ) : null}
                </div>
                <div className="panel-body space-y-3">
                  {reason ? <p className="text-sm text-muted">{reason}</p> : null}
                  {lineError ? <Alert>{lineError}</Alert> : null}
                  {lineForm ? (
                    <LineForm
                      form={lineForm}
                      onChange={setLineForm}
                      onSubmit={saveLine}
                      saving={lineBusy}
                      editing={!!editingLine}
                      onDelete={deleteLine}
                      onCancel={() => {
                        setLineForm(null);
                        setEditingLine(null);
                        setLineError("");
                      }}
                    />
                  ) : null}
                  {lines.length === 0 ? (
                    <p className="px-1 text-sm text-muted">
                      No lines yet. Add what this invoice bills for.
                    </p>
                  ) : (
                    <ul className="doc-lines">
                      {lines.map((item) => {
                        const body = (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="doc-line-sub">
                                {item.description ? `${item.description} · ` : ""}
                                {Number(item.quantity).toLocaleString("en-US")} × {formatMoney(item.unit_price)}
                              </div>
                            </div>
                            <div className="num shrink-0 font-semibold">{formatMoney(item.line_total)}</div>
                          </>
                        );
                        return (
                          <li key={item.id}>
                            {locked ? (
                              <div className="doc-line">{body}</div>
                            ) : (
                              <button
                                type="button"
                                className="doc-line"
                                aria-label={`Edit ${item.name}`}
                                onClick={() => {
                                  setEditingLine(item);
                                  setLineError("");
                                  setLineForm({
                                    name: item.name,
                                    description: item.description ?? "",
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                  });
                                }}
                              >
                                {body}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="border-t border-base pt-3">
                    <InvoiceTotals invoice={invoice} />
                  </div>
                </div>
              </section>
            </TabPanel>
          </div>

          {layout.railVisible ? (
            <aside className="record-rail" aria-label="Invoice details">
              <RailPanel title="Totals">
                <InvoiceTotals invoice={invoice} />
              </RailPanel>
              <RailPanel title="Dates">
                <DetailList
                  items={[
                    { label: "Created", value: formatDate(invoice.created_at) },
                    {
                      label: "Sent",
                      value: invoice.sent_at
                        ? formatDate(invoice.sent_at)
                        : invoice.status === "Draft"
                          ? "Not yet"
                          : null,
                    },
                    { label: "Due", value: invoice.due_date ? formatDate(invoice.due_date) : "On receipt" },
                    { label: "Paid", value: invoice.paid_at ? formatDate(invoice.paid_at) : null },
                    { label: "Voided", value: invoice.voided_at ? formatDate(invoice.voided_at) : null },
                  ]}
                />
              </RailPanel>
              <RailPanel title="Client sees">
                <p className="text-xs text-muted">
                  {invoice.status === "Draft"
                    ? "Nothing yet. Drafts never reach the portal or a link."
                    : invoice.status === "Void"
                      ? "Nothing. Void invoices drop off the portal."
                      : "This invoice, its lines and notes, payments received and the balance."}
                </p>
                {invoice.share_expires_at && invoice.status !== "Void" ? (
                  <p className="text-xs text-muted">
                    Link open until {formatDate(invoice.share_expires_at)}.
                  </p>
                ) : null}
              </RailPanel>
              {invoice.notes ? (
                <RailPanel title="Notes (client sees these)">
                  <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
                </RailPanel>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
      {confirmModal}
    </AppShell>
  );
}
