"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await api(`/leads/${id}`);
        if (!alive) return;
        setLead(res.lead ?? res);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load lead");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      router.push("/leads");
      api(`/leads/${id}`, { method: "DELETE" }).catch((e) => {
        alert(e?.message || "Failed to delete lead");
      });
    } catch (e) {
      alert(e?.message || "Failed to delete lead");
    }
  };

  return (
    <AppShell title={`Lead #${id}`}>
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <div className="bg-surface border-base rounded-lg border p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : !lead ? (
            <div className="text-muted-foreground text-sm">Not found.</div>
          ) : (
            <div className="flex flex-row gap-6">
              <div className="space-y-2">
                <div className="text-xl font-semibold">
                  {lead.first_name} {lead.last_name}
                </div>
                <div className="text-muted-foreground text-sm">
                  {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {lead.status ?? "—"}
                  </span>
                  {lead.source ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      {lead.source}
                    </span>
                  ) : null}
                </div>

                {lead.notes ? (
                  <div className="pt-3 text-sm">
                    <div className="text-muted-foreground text-xs">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap">{lead.notes}</div>
                  </div>
                ) : null}
              </div>
              <button
                className="ml-auto flex h-8 w-8 items-center justify-center rounded border p-1"
                onClick={() => handleDelete()}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Link
              href={`/tasks/new?lead_id=${id}`}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              + Create task for this lead
            </Link>

            <Link
              href={`/leads/${id}/edit`}
              className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Edit
            </Link>
          </div>
          <button
            className="hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            onClick={() => router.push("/leads")}
          >
            Back to leads
          </button>
        </div>
      </div>
    </AppShell>
  );
}
