"use client";

import { Alert } from "@/components/ui/alert";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { api } from "@/lib/api";
import { PageToolbar } from "@/components/page-toolbar";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/icons";
import { InvoicesList } from "@/components/lists/invoices-list";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"];

const DUE_OPTIONS = [
  { value: "", label: "Any due date" },
  { value: "this_week", label: "Due this week" },
  { value: "overdue", label: "Past due" },
];

function InvoicesPageInner() {
  const push = useReturnPush();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") || "";
  const dueParam = searchParams.get("due") || "";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(() =>
    INVOICE_STATUSES.includes(statusParam) ? statusParam : "",
  );
  const [dueFilter, setDueFilter] = useState(() =>
    dueParam === "this_week" || dueParam === "overdue" ? dueParam : "",
  );

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
    const counts = { Draft: 0, Sent: 0, Paid: 0, Overdue: 0 };
    for (const invoice of invoices) {
      if (counts[invoice.status] != null) counts[invoice.status] += 1;
    }
    return counts;
  }, [invoices]);

  const needle = q.trim().toLowerCase();
  const visible = useMemo(() => {
    return invoices.filter((invoice) => {
      if (status && invoice.status !== status) return false;
      if (!needle) return true;
      const hay = [
        invoice.invoice_number,
        invoice.lead_name,
        invoice.job_title,
      ]
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
    ...INVOICE_STATUSES.map((column) => ({
      value: column,
      label: column,
      count: loading ? undefined : (byStatus[column] ?? 0),
      countTone:
        column === "Overdue" && !loading && overdueCount > 0
          ? "danger"
          : undefined,
    })),
  ];

  return (
    <AppShell
      title="Invoices"
      description={loading ? "Loading…" : `${visible.length} in this view`}
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
              className="input min-w-0 w-full flex-1 basis-48"
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
            className="input min-w-0 w-full sm:w-44"
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

        <InvoicesList
          layout="flush"
          invoices={visible}
          loading={loading}
          onOpen={(invoiceId) => push(`/invoices/${invoiceId}`)}
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
          <div className="text-muted p-4 text-sm">Loading…</div>
        </AppShell>
      }
    >
      <InvoicesPageInner />
    </Suspense>
  );
}
