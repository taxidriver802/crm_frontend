"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useReturnPush } from "@/components/return-to";
import { api } from "@/lib/api";
import { ListToolbar } from "@/components/list-toolbar";
import { PageError } from "@/components/error-boundary";
import { Segmented } from "@/components/ui/segmented";
import { InvoicesList } from "@/components/lists/invoices-list";

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Paid", "Overdue"];
const DUE_OPTIONS = [
  { value: "", label: "All due dates" },
  { value: "this_week", label: "Due this week" },
  { value: "overdue", label: "Overdue" },
];

export default function InvoicesListPage() {
  const push = useReturnPush();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState("");

  async function loadInvoices() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (dueFilter) params.set("due", dueFilter);

      const res = await api(`/invoices?${params.toString()}`);
      setInvoices(res.invoices || []);
    } catch (e) {
      setError(e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, dueFilter]);

  return (
    <AppShell title="Invoices">
      <div className="space-y-4">
        {error ? <PageError message={error} onRetry={loadInvoices} /> : null}

        <ListToolbar
          left={
            <>
              <Segmented
                aria-label="Invoice status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
              <select
                className="input h-9 text-sm"
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value)}
              >
                {DUE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </>
          }
          right={
            <Link href="/invoices/new" className="btn px-3 py-2 text-sm">
              + New Invoice
            </Link>
          }
        />

        <InvoicesList
          invoices={invoices}
          loading={loading}
          onOpen={(invoiceId) => push(`/invoices/${invoiceId}`)}
        />
      </div>
    </AppShell>
  );
}
