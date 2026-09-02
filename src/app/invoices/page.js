"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { ListToolbar } from "@/components/list-toolbar";
import { TableRowSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import { formatDate } from "@/lib/helper";
import { StatusBadge } from "@/components/ui/status-badge";
import { Segmented } from "@/components/ui/segmented";

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Paid", "Overdue"];
const DUE_OPTIONS = [
  { value: "", label: "All due dates" },
  { value: "this_week", label: "Due this week" },
  { value: "overdue", label: "Overdue" },
];

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoicesListPage() {
  const router = useRouter();
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

        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Job</th>
                <th>Client</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center">
                    No invoices match the current filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="font-medium">{inv.invoice_number}</td>
                    <td>
                      <Link
                        href={`/jobs/${inv.job_id}`}
                        className="underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.job_title || `Job #${inv.job_id}`}
                      </Link>
                    </td>
                    <td>{inv.lead_name || "—"}</td>
                    <td>
                      <StatusBadge kind="invoice" status={inv.status} />
                    </td>
                    <td className="text-right font-semibold">
                      ${formatCurrency(inv.grand_total)}
                    </td>
                    <td>
                      {inv.due_date ? formatDate(inv.due_date) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
