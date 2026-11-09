"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { Menu, MenuDivider, MenuItem } from "@/components/ui/menu";
import { Icon } from "@/components/icons";
import { PeekLink, usePeek } from "@/components/peek/peek-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PinMenu } from "@/components/workspace/pin-menu";
import { DetailList, RecordUnavailable, StatusPill } from "@/components/records/record-bits";
import { RailPanel, TabPanel, Tabs, useRecordSections, useUrlTab } from "@/components/records/record-layout";
import { EstimateLineItemForm, createEmptyLineItem } from "@/components/forms/estimate-line-item-form";
import { EstimateNextStep, useEstimateActions } from "@/components/documents/estimate-parts";
import { INVOICE_KIND_LABEL, formatMoney } from "@/lib/job-lifecycle";
import { announceChange, useRecordChanges } from "@/lib/record-events";

const TABS = ["scope", "billing"];

function EstimateTotals({ estimate }) {
  const rows = [
    { label: "Subtotal", value: formatMoney(estimate.subtotal) },
    estimate.discount_total > 0 ? { label: "Discount", value: `−${formatMoney(estimate.discount_total)}` } : null,
    estimate.tax_total > 0 ? { label: "Tax", value: formatMoney(estimate.tax_total) } : null,
    { label: "Total", value: formatMoney(estimate.grand_total), strong: true, testId: "estimate-total" },
  ].filter(Boolean);
  return (
    <div className="totals">
      {rows.map((row) => (
        <div key={row.label} className={row.strong ? "totals-row totals-row-strong" : "totals-row"}>
          <span>{row.label}</span>
          <span className="num" data-testid={row.testId}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** What the client said on the link, and what that means now. */
function ClientResponse({ estimate }) {
  if (!estimate.client_responded_at) return null;
  const said =
    estimate.status === "Approved"
      ? "The client approved this estimate."
      : estimate.status === "Rejected"
        ? "The client declined."
        : "The client asked for changes.";
  return (
    <section className="panel" data-testid="client-response">
      <div className="panel-head">
        <h2 className="panel-title">Client response</h2>
        <span className="text-xs text-muted">{formatDate(estimate.client_responded_at)}</span>
      </div>
      <div className="panel-body space-y-2 text-sm">
        <p>{said}</p>
        {estimate.client_response_note ? (
          <blockquote className="whitespace-pre-wrap rounded-md border border-dashed border-base p-3">
            {estimate.client_response_note}
          </blockquote>
        ) : null}
      </div>
    </section>
  );
}

export default function EstimateRecordPage() {
  const { id } = useParams();
  const router = useRouter();
  const workspace = useWorkspace();
  const { openPeek } = usePeek();
  const { askConfirm, confirmModal } = useConfirmModal();
  const [tab, setTab] = useUrlTab("scope", TABS);
  const layout = useRecordSections("estimate", []);
  const lineFormRef = useRef(null);

  const [estimate, setEstimate] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lineForm, setLineForm] = useState(null);
  const [editingLine, setEditingLine] = useState(null);
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api(`/estimates/${id}`);
      const next = res?.estimate ?? res;
      setEstimate(next);
      setLoadError(null);
      // Change orders live beside the estimate they amend, on the same job.
      api(`/estimates/job/${next.job_id}`)
        .then((list) => setSiblings(list?.estimates || []))
        .catch(() => setSiblings([]));
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

  useEffect(() => {
    if (estimate?.status !== "Draft") return;
    let cancelled = false;
    api("/estimate-templates")
      .then((res) => {
        if (!cancelled) setTemplates(res?.templates || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [estimate?.status]);

  // An invoice paid or voided in a peek changes what this estimate's billing shows.
  useRecordChanges((detail) => {
    if (!estimate) return;
    if (detail.kind === "estimate" && String(detail.id) === String(id)) return;
    if (detail.kind === "invoice" && String(detail.jobId) === String(estimate.job_id)) load();
  });

  const actions = useEstimateActions(estimate || { id, job_id: null }, setEstimate);

  useEffect(() => {
    if (lineForm) lineFormRef.current?.querySelector("input")?.focus();
  }, [lineForm]);

  if (loading && !estimate) {
    return (
      <AppShell title="Estimate">
        <div className="space-y-4" aria-busy="true">
          <div className="skeleton h-40 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!estimate) {
    return (
      <AppShell title="Estimate">
        <RecordUnavailable
          noun="estimate"
          error={loadError}
          listHref="/estimates"
          listLabel="Estimates"
          onRetry={load}
        />
      </AppShell>
    );
  }

  const lines = estimate.line_items || [];
  const locked = estimate.locked;
  const pinned = workspace.isPinned("estimate", estimate.id);
  const changeOrders = siblings.filter((e) => String(e.change_order_of) === String(estimate.id));
  const invoices = estimate.invoices || [];

  function startLine() {
    setTab("scope");
    setEditingLine(null);
    setLineError("");
    setLineForm(createEmptyLineItem());
  }

  function editLine(item) {
    setEditingLine(item);
    setLineError("");
    setLineForm({
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
  }

  function closeLineForm() {
    setLineForm(null);
    setEditingLine(null);
    setLineError("");
  }

  async function saveLine(event) {
    event.preventDefault();
    const quantity = lineForm.quantity === "" ? 1 : Number(lineForm.quantity);
    if (!(quantity >= 1)) {
      setLineError("Quantity must be at least 1.");
      return;
    }
    setLineBusy(true);
    setLineError("");
    try {
      const path = editingLine
        ? `/estimates/${estimate.id}/line-items/${editingLine.id}`
        : `/estimates/${estimate.id}/line-items`;
      const res = await api(path, {
        method: editingLine ? "PATCH" : "POST",
        body: JSON.stringify({ ...lineForm, quantity }),
      });
      setEstimate(res.estimate);
      closeLineForm();
      announceChange({ kind: "estimate", id: estimate.id, jobId: estimate.job_id });
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
          await api(`/estimates/${estimate.id}/line-items/${editingLine.id}`, { method: "DELETE" });
          closeLineForm();
          await load();
          announceChange({ kind: "estimate", id: estimate.id, jobId: estimate.job_id });
        } catch (e) {
          setLineError(e?.message || "Could not delete the line");
        }
      },
    });
  }

  async function applyTemplate() {
    if (!templateId) return;
    const run = async () => {
      setTemplateBusy(true);
      setLineError("");
      try {
        const res = await api(`/estimates/${estimate.id}/apply-template`, {
          method: "POST",
          body: JSON.stringify({ template_id: Number(templateId) }),
        });
        if (res?.estimate) setEstimate(res.estimate);
        else await load();
        setTemplateId("");
        announceChange({ kind: "estimate", id: estimate.id, jobId: estimate.job_id });
      } catch (e) {
        setLineError(e?.message || "Could not apply the template");
      } finally {
        setTemplateBusy(false);
      }
    };
    if (lines.length > 0) {
      askConfirm({
        title: "Add the template's lines?",
        description: "They are added after the lines already here.",
        confirmLabel: "Apply template",
        tone: "default",
        onConfirm: run,
      });
      return;
    }
    await run();
  }

  async function startChangeOrder() {
    const next = await actions.changeOrder();
    if (next) router.push(`/estimates/${next.id}`);
  }

  function confirmDeclined() {
    askConfirm({
      title: "Mark this estimate declined?",
      description: "Use this when the client said no another way. You can revise and resend it after.",
      confirmLabel: "Mark declined",
      tone: "danger",
      onConfirm: () => actions.setStatus("Rejected", "Marked declined."),
    });
  }

  return (
    <AppShell title={estimate.title || `Estimate #${estimate.id}`} description={estimate.job?.title || undefined}>
      <div className="min-w-0 space-y-4">
        <section className="record-head" data-testid="estimate-head">
          <div className="record-head-top">
            <div className="min-w-0 space-y-2">
              <div className="record-meta">
                <StatusPill kind="estimate" status={estimate.status} />
                {estimate.change_order_of ? <span className="tag">Change order</span> : null}
                <span>
                  Job{" "}
                  <PeekLink kind="job" id={estimate.job_id} className="link">
                    {estimate.job?.title || `Job #${estimate.job_id}`}
                  </PeekLink>
                </span>
                {estimate.job?.lead_id ? (
                  <span>
                    Client{" "}
                    <PeekLink kind="lead" id={estimate.job.lead_id} className="link">
                      {estimate.job.lead_name}
                    </PeekLink>
                  </span>
                ) : null}
                {estimate.change_order_of ? (
                  <span>
                    Amends{" "}
                    <PeekLink kind="estimate" id={estimate.change_order_of} className="link">
                      {estimate.change_order_of_title || `Estimate #${estimate.change_order_of}`}
                    </PeekLink>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="big-number num">{formatMoney(estimate.grand_total)}</span>
                <span className="text-sm text-muted">
                  {lines.length} line{lines.length === 1 ? "" : "s"}
                  {estimate.approved_at ? ` · approved ${formatDate(estimate.approved_at)}` : ""}
                  {!estimate.approved_at && estimate.sent_at ? ` · sent ${formatDate(estimate.sent_at)}` : ""}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <PinMenu kind="estimate" id={estimate.id} label={estimate.title} href={`/estimates/${estimate.id}`} />
              <Link className="btn btn-sm" href={`/estimates/${estimate.id}/edit`}>
                Edit
              </Link>
              <Menu
                align="end"
                label="Estimate actions"
                className="w-60"
                trigger={(props) => (
                  <button type="button" {...props} className="btn btn-sm" aria-label="More estimate actions">
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
                    {lines.length > 0 ? (
                      <>
                        <MenuItem
                          icon={<Icon name="link" className="h-4 w-4 text-muted" />}
                          onSelect={() => {
                            close();
                            actions.send();
                          }}
                        >
                          {estimate.status === "Draft" && !estimate.client_responded_at
                            ? "Copy link (sends it)"
                            : "Copy a new client link"}
                        </MenuItem>
                        <MenuItem
                          icon={<Icon name="mail" className="h-4 w-4 text-muted" />}
                          onSelect={() => {
                            close();
                            actions.copyMessage();
                          }}
                        >
                          Copy message
                        </MenuItem>
                      </>
                    ) : null}
                    {estimate.status === "Approved" ? (
                      <>
                        <MenuDivider />
                        <MenuItem
                          icon={<Icon name="plus" className="h-4 w-4 text-muted" />}
                          onSelect={() => {
                            close();
                            startChangeOrder();
                          }}
                        >
                          Add change order
                        </MenuItem>
                      </>
                    ) : null}
                    {estimate.status === "Sent" ? (
                      <>
                        <MenuDivider />
                        <MenuItem
                          danger
                          onSelect={() => {
                            close();
                            confirmDeclined();
                          }}
                        >
                          Mark declined
                        </MenuItem>
                      </>
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
          <EstimateNextStep
            estimate={estimate}
            actions={actions}
            onAddScope={startLine}
            onBilled={(invoice) => openPeek("invoice", invoice.id)}
            onOpenInvoice={(invoiceId) => openPeek("invoice", invoiceId)}
          />
        </section>

        <div className={layout.railVisible ? "record-grid" : "record-grid record-grid-norail"}>
          <div className="record-main">
            <Tabs
              label="Estimate sections"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "scope", label: "Scope", count: lines.length },
                { id: "billing", label: "Billing", count: invoices.length + changeOrders.length },
              ]}
            />

            <TabPanel id="scope" active={tab === "scope"}>
              <div className="space-y-4">
                <ClientResponse estimate={estimate} />
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">Line items</h2>
                    {!locked && !lineForm ? (
                      <button type="button" className="btn btn-sm" onClick={startLine}>
                        <Icon name="plus" className="h-3.5 w-3.5" />
                        Add line
                      </button>
                    ) : null}
                  </div>
                  <div className="panel-body space-y-3">
                    {locked ? (
                      <p className="text-sm text-muted">
                        Approved scope is what the client agreed to, so it is locked. New or different work
                        goes on a change order.
                      </p>
                    ) : null}
                    {lineError ? <Alert>{lineError}</Alert> : null}
                    {estimate.status === "Draft" && templates.length > 0 && !lineForm ? (
                      <div className="doc-form flex-row flex-wrap items-end" data-testid="apply-template">
                        <label className="field-label block min-w-[12rem] flex-1">
                          Start from a template
                          <select
                            className="input mt-1"
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            disabled={templateBusy}
                          >
                            <option value="">Choose a template…</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!templateId || templateBusy}
                          onClick={applyTemplate}
                        >
                          {templateBusy ? "Applying…" : "Apply template"}
                        </button>
                      </div>
                    ) : null}
                    {lineForm ? (
                      <div ref={lineFormRef} className="doc-form" data-testid="estimate-line-form">
                        <EstimateLineItemForm
                          form={lineForm}
                          onChange={setLineForm}
                          onSubmit={saveLine}
                          saving={lineBusy}
                          onCancel={closeLineForm}
                          submitLabel={editingLine ? "Update line" : "Add line"}
                          deleteButton={!!editingLine}
                          onDelete={deleteLine}
                        />
                      </div>
                    ) : null}
                    {lines.length === 0 ? (
                      <p className="px-1 text-sm text-muted">No lines yet. Add what the client is buying.</p>
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
                                  onClick={() => editLine(item)}
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
                      <EstimateTotals estimate={estimate} />
                    </div>
                  </div>
                </section>
                {estimate.notes ? (
                  <section className="panel">
                    <div className="panel-head">
                      <h2 className="panel-title">Notes</h2>
                      <span className="text-xs text-muted">The client sees these</span>
                    </div>
                    <div className="panel-body">
                      <p className="whitespace-pre-wrap text-sm">{estimate.notes}</p>
                    </div>
                  </section>
                ) : null}
              </div>
            </TabPanel>

            <TabPanel id="billing" active={tab === "billing"}>
              <div className="space-y-4">
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">Invoices from this estimate</h2>
                  </div>
                  <div className="panel-body">
                    {invoices.length === 0 ? (
                      <p className="text-sm text-muted">
                        {estimate.status === "Approved"
                          ? "Not billed yet. Request a deposit or bill it all from the next step above."
                          : "Billing starts once the client approves."}
                      </p>
                    ) : (
                      <ul className="doc-lines">
                        {invoices.map((inv) => (
                          <li key={inv.id}>
                            <PeekLink kind="invoice" id={inv.id} className="doc-line">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium">{inv.invoice_number}</div>
                                <div className="doc-line-sub">{INVOICE_KIND_LABEL[inv.kind] || "Invoice"}</div>
                              </div>
                              <StatusPill kind="invoice" status={inv.status} />
                              <div className="num shrink-0 font-semibold">{formatMoney(inv.grand_total)}</div>
                            </PeekLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
                {!estimate.change_order_of ? (
                  <section className="panel">
                    <div className="panel-head">
                      <h2 className="panel-title">Change orders</h2>
                      {estimate.status === "Approved" ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!!actions.busy}
                          onClick={startChangeOrder}
                        >
                          <Icon name="plus" className="h-3.5 w-3.5" />
                          Add change order
                        </button>
                      ) : null}
                    </div>
                    <div className="panel-body">
                      {changeOrders.length === 0 ? (
                        <p className="text-sm text-muted">
                          {estimate.status === "Approved"
                            ? "None. Extra or different work after approval goes on a change order the client approves separately."
                            : "Change orders amend an approved estimate."}
                        </p>
                      ) : (
                        <ul className="doc-lines">
                          {changeOrders.map((co) => (
                            <li key={co.id}>
                              <PeekLink kind="estimate" id={co.id} className="doc-line">
                                <div className="min-w-0 flex-1 font-medium">{co.title}</div>
                                <StatusPill kind="estimate" status={co.status} />
                                <div className="num shrink-0 font-semibold">{formatMoney(co.grand_total)}</div>
                              </PeekLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>
            </TabPanel>
          </div>

          {layout.railVisible ? (
            <aside className="record-rail" aria-label="Estimate details">
              <RailPanel title="Totals">
                <EstimateTotals estimate={estimate} />
              </RailPanel>
              <RailPanel title="Dates">
                <DetailList
                  items={[
                    { label: "Created", value: formatDate(estimate.created_at) },
                    {
                      label: "Sent",
                      value: estimate.sent_at
                        ? formatDate(estimate.sent_at)
                        : estimate.status === "Draft"
                          ? "Not yet"
                          : null,
                    },
                    { label: "Approved", value: estimate.approved_at ? formatDate(estimate.approved_at) : null },
                    {
                      label: "Answered",
                      value: estimate.client_responded_at ? formatDate(estimate.client_responded_at) : null,
                    },
                  ]}
                />
              </RailPanel>
              <RailPanel title="Client sees">
                <p className="text-xs text-muted">
                  {estimate.status === "Draft" && !estimate.sent_at
                    ? "Nothing yet. Copying the link sends it."
                    : estimate.status === "Approved"
                      ? "The approved scope, the total and the notes, marked approved."
                      : "The scope, the total, the notes, and buttons to approve, decline or ask for changes."}
                </p>
                {estimate.share_expires_at ? (
                  <p className="text-xs text-muted">Link open until {formatDate(estimate.share_expires_at)}.</p>
                ) : null}
              </RailPanel>
            </aside>
          ) : null}
        </div>
      </div>
      {confirmModal}
    </AppShell>
  );
}
