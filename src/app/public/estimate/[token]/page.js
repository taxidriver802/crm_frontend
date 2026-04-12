"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/helper";

async function publicFetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PublicEstimatePage() {
  const { token } = useParams();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  const rawToken = Array.isArray(token) ? token[0] : token;

  async function load() {
    if (!rawToken) return;
    try {
      setLoading(true);
      setError("");
      const res = await publicFetchJson(
        `/public/estimates/${encodeURIComponent(rawToken)}`,
      );
      setEstimate(res.estimate);
    } catch (e) {
      setError(e?.message || "Could not load estimate");
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [rawToken]);

  async function respond(decision) {
    if (!rawToken) return;
    setSubmitting(true);
    setDoneMessage("");
    try {
      const res = await publicFetchJson(
        `/public/estimates/${encodeURIComponent(rawToken)}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            note: note.trim() || null,
          }),
        },
      );
      setEstimate(res.estimate);
      setNote("");
      setDoneMessage(
        decision === "approve"
          ? "Thank you — this estimate is marked as accepted."
          : decision === "reject"
            ? "Your response has been recorded."
            : "We’ve noted that you’d like changes.",
      );
    } catch (e) {
      setError(e?.message || "Could not submit response");
    } finally {
      setSubmitting(false);
    }
  }

  const pdfHref = rawToken
    ? `${API_BASE}/public/estimates/${encodeURIComponent(rawToken)}/pdf`
    : "#";

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="text-muted text-sm">Shared estimate</div>
          <h1 className="mt-2 text-2xl font-semibold">{estimate?.title || "Estimate"}</h1>
          {estimate?.job?.address ? (
            <p className="text-muted mt-2 text-sm">{estimate.job.address}</p>
          ) : null}
        </div>

        {error ? (
          <div className="card rounded-lg p-4 text-sm text-red-600">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-muted text-center text-sm">Loading…</div>
        ) : !estimate ? (
          <div className="text-muted text-center text-sm">Nothing to show.</div>
        ) : (
          <div className="space-y-6">
            <div className="card rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="status-chip text-xs">{estimate.status}</span>
                <a
                  href={pdfHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm px-3 py-1.5"
                >
                  View PDF
                </a>
              </div>

              {estimate.job?.lead_name ? (
                <div className="text-muted mt-3 text-sm">
                  Prepared for: {estimate.job.lead_name}
                </div>
              ) : null}

              {estimate.notes ? (
                <div className="mt-4">
                  <div className="text-muted text-xs">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{estimate.notes}</div>
                </div>
              ) : null}
            </div>

            <div className="card rounded-lg p-4">
              <h2 className="text-sm font-medium">Line items</h2>
              <div className="mt-3 space-y-3">
                {(estimate.line_items || []).map((item) => (
                  <div
                    key={item.id}
                    className="border-base flex justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description ? (
                        <div className="text-muted mt-1 text-sm">{item.description}</div>
                      ) : null}
                      <div className="text-muted mt-1 text-xs">
                        {Number(item.quantity).toLocaleString()} × $
                        {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div className="shrink-0 font-semibold">
                      ${formatCurrency(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-base mt-4 flex justify-between border-t pt-4 text-lg font-semibold">
                <span>Total</span>
                <span>${formatCurrency(estimate.grand_total)}</span>
              </div>
            </div>

            {estimate.client_responded_at ? (
              <div className="card rounded-lg p-4 text-sm">
                <div className="font-medium">Your response</div>
                <div className="text-muted mt-2">
                  Recorded {new Date(estimate.client_responded_at).toLocaleString()}
                </div>
                {estimate.client_response_note ? (
                  <div className="mt-2 whitespace-pre-wrap">
                    {estimate.client_response_note}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="card space-y-4 rounded-lg p-4">
                <div>
                  <div className="text-sm font-medium">Respond to this estimate</div>
                  <p className="text-muted mt-1 text-sm">
                    Accept, decline, or ask for a revision. Optional note for your
                    contractor.
                  </p>
                </div>

                <textarea
                  className="border-base bg-surface w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn px-4 py-2 text-sm"
                    disabled={submitting}
                    onClick={() => respond("approve")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-4 py-2 text-sm"
                    disabled={submitting}
                    onClick={() => respond("revision")}
                  >
                    Request revision
                  </button>
                  <button
                    type="button"
                    className="btn border-red-500/40 px-4 py-2 text-sm text-red-700 dark:text-red-300"
                    disabled={submitting}
                    onClick={() => respond("reject")}
                  >
                    Decline
                  </button>
                </div>

                {doneMessage ? (
                  <div className="text-muted text-sm">{doneMessage}</div>
                ) : null}
              </div>
            )}
          </div>
        )}

        <p className="text-muted mt-10 text-center text-xs">
          <Link href="/" className="underline underline-offset-4">
            Contractor sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
