"use client";

import { useUrlFilterSync } from "@/lib/url-filters";
import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { PageToolbar } from "@/components/page-toolbar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { RecordTable } from "@/components/ui/record-table";
import { INVOICE_COLUMNS } from "@/components/lists/columns";
import { formatMoney } from "@/lib/job-lifecycle";

/** Open = sent and not yet paid in full (Sent, Partially Paid, Overdue). */
const OPEN_STATUSES = new Set(["Sent", "Partially Paid", "Overdue"]);
const INVOICE_FILTERS = [
  { value: "Draft", label: "Draft", match: (inv) => inv.status === "Draft" },
  { value: "Open", label: "Open", match: (inv) => OPEN_STATUSES.has(inv.status) },
  { value: "Overdue", label: "Overdue", short: "Late", match: (inv) => inv.status === "Overdue" },
  { value: "Paid", label: "Paid", match: (inv) => inv.status === "Paid" },
  { value: "Void", label: "Void", match: (inv) => inv.status === "Void" },
];
const INVOICE_STATUSES = INVOICE_FILTERS.map((f) => f.value);

const DUE_OPTIONS = [
  { value: "", label: "Any due date" },
  { value: "this_week", label: "Due this week" },
  { value: "overdue", label: "Past due" },
];

function InvoicesPageInner() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") || "";
  const dueParam = searchParams.get("due") || "";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(() =>
    INVOICE_STATUSES.includes(statusParam) ? statusParam : "",
  );
  const [dueFilter, setDueFilter] = useState(() =>
    dueParam === "this_week" || dueParam === "overdue" ? dueParam : "",
  );

  useUrlFilterSync({ q, status, due: dueFilter }, { q: "", status: "", due: "" });

  useEffect(() => {
    setStatus(INVOICE_STATUSES.includes(statusParam) ? statusParam : "");
  }, [statusParam]);

  useEffect(() => {
    setDueFilter(dueParam === "this_week" || dueParam === "overdue" ? dueParam : "");
  }, [dueParam]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dueFilter) params.set("due", dueFilter);
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [dueFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await api(`/invoices${queryString}`);
      setInvoices(res.invoices || []);
    } catch (e) {
      setError(e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    setError("");
    await loadInvoices();
  }

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const byStatus = useMemo(() => {
    const counts = Object.fromEntries(INVOICE_FILTERS.map((f) => [f.value, 0]));
    for (const invoice of invoices) {
      for (const filter of INVOICE_FILTERS) {
        if (filter.match(invoice)) counts[filter.value] += 1;
      }
    }
    return counts;
  }, [invoices]);

  const outstanding = useMemo(
    () =>
      invoices
        .filter((inv) => OPEN_STATUSES.has(inv.status))
        .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0),
    [invoices],
  );

  const needle = q.trim().toLowerCase();
  const visible = useMemo(() => {
    return invoices.filter((invoice) => {
      const activeFilter = INVOICE_FILTERS.find((f) => f.value === status);
      if (activeFilter && !activeFilter.match(invoice)) return false;
      if (!needle) return true;
      const hay = [invoice.invoice_number, invoice.lead_name, invoice.job_title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [invoices, status, needle]);

  const overdueCount = byStatus.Overdue;
  const statusOptions = [
    {
      value: "",
      label: "All",
      count: loading ? undefined : invoices.length,
    },
    ...INVOICE_FILTERS.map((filter) => ({
      value: filter.value,
      label: filter.label,
      short: filter.short,
      count: loading ? undefined : (byStatus[filter.value] ?? 0),
      countTone:
        filter.value === "Overdue" && !loading && overdueCount > 0 ? "danger" : undefined,
    })),
  ];

  return (
    <AppShell
      title="Invoices"
      description={
        loading
          ? "Loading…"
          : `${visible.length} in this view · ${formatMoney(outstanding)} outstanding`
      }
    >
      <div className="space-y-6">
        {error ? <Alert variant="inline">{error}</Alert> : null}

        <Segmented
          className="w-full min-w-0"
          aria-label="Invoice status"
          value={status}
          onChange={setStatus}
          options={statusOptions}
        />

        <PageToolbar
          search={
            <input
              className="input w-full min-w-0 flex-1 basis-48"
              placeholder="Search number, lead, job…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
          refresh={
            <button
              type="button"
              className="icon-btn"
              onClick={refreshAll}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refreshCcw" className="h-4 w-4" />
            </button>
          }
          create={
            <Link href="/invoices/new" className="btn btn-primary">
              New invoice
            </Link>
          }
        >
          <select
            className="input w-full min-w-0 sm:w-44"
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            aria-label="Due date"
          >
            {DUE_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </PageToolbar>

        <RecordTable
          listKey="invoices"
          kind="invoice"
          rows={visible}
          columns={INVOICE_COLUMNS}
          loading={loading}
          getHref={(row) => `/invoices/${row.id}`}
          emptyTitle={status || q ? "No invoices match this view" : "No invoices yet"}
          emptyDescription="Invoices come from a job: bill a deposit or the final invoice from its Money section."
        />
      </div>
    </AppShell>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Invoices">
          <div className="p-4 text-sm text-muted">Loading…</div>
        </AppShell>
      }
    >
      <InvoicesPageInner />
    </Suspense>
  );
}
