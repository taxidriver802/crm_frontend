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

function StatusBadge({ status }) {
  const map = {
    Draft: "border-gray-500/30 bg-gray-500/10 text-gray-700",
    Sent: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    Paid: "border-green-500/30 bg-green-500/10 text-green-700",
    Overdue: "border-red-500/30 bg-red-500/10 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${map[status] || ""}`}
    >
      {status}
    </span>
  );
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
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn px-3 py-2 text-xs ${statusFilter === s ? "bg-accent text-main" : ""}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
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

        <div className="card overflow-hidden rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-base border-b text-left">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted px-4 py-8 text-center">
                    No invoices match the current filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-base hover:bg-accent cursor-pointer border-t transition"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/jobs/${inv.job_id}`}
                        className="underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.job_title || `Job #${inv.job_id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.lead_name || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${formatCurrency(inv.grand_total)}
                    </td>
                    <td className="px-4 py-3">
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
