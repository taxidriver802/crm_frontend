"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { Field, FormActions } from "@/components/ui/field";
import { EmptyState } from "@/components/error-boundary";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { PublicFrame } from "@/components/public/public-frame";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <PublicFrame
      width="narrow"
      eyebrow="Shared estimate"
      title={estimate?.title || "Estimate"}
      description={estimate?.job?.address || undefined}
      footer={
        <Link href="/" className="hover:text-main underline-offset-4 hover:underline">
          Contractor sign in
        </Link>
      }
    >
      {error ? <Alert variant="inline">{error}</Alert> : null}

      {loading ? (
        <SectionCard title="Estimate">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </SectionCard>
      ) : !estimate ? (
        error ? null : (
          <EmptyState
            title="Nothing to show"
            description="This estimate link is invalid or has expired."
          />
        )
      ) : (
        <>
          <SectionCard
            title="Summary"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="estimate" status={estimate.status} />
                <a
                  href={pdfHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm px-3 py-1.5"
                >
                  View PDF
                </a>
              </div>
            }
          >
            {estimate.job?.lead_name ? (
              <p className="text-muted text-sm">
                Prepared for: {estimate.job.lead_name}
              </p>
            ) : null}
            {estimate.notes ? (
              <div className={estimate.job?.lead_name ? "mt-4" : ""}>
                <div className="kv-label">Notes</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{estimate.notes}</div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Line items">
            <div className="space-y-2">
              {(estimate.line_items || []).map((item) => (
                <ListRow
                  key={item.id}
                  className="flex items-start justify-between gap-3"
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
                </ListRow>
              ))}
            </div>

            <div className="border-base mt-4 flex justify-between border-t pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>${formatCurrency(estimate.grand_total)}</span>
            </div>
          </SectionCard>

          {estimate.client_responded_at ? (
            <SectionCard title="Your response">
              {doneMessage ? (
                <Alert variant="inline" tone="success" className="mb-3">
                  {doneMessage}
                </Alert>
              ) : null}
              <p className="text-muted text-sm">
                Recorded {new Date(estimate.client_responded_at).toLocaleString()}
              </p>
              {estimate.client_response_note ? (
                <div className="mt-2 whitespace-pre-wrap text-sm">
                  {estimate.client_response_note}
                </div>
              ) : null}
            </SectionCard>
          ) : (
            <SectionCard
              title="Respond to this estimate"
              description="Accept, decline, or ask for a revision. Optional note for your contractor."
            >
              <Field htmlFor="estimate-note" label="Optional note">
                <textarea
                  id="estimate-note"
                  className="input"
                  rows={3}
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>

              <FormActions className="mt-4">
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 text-sm"
                  disabled={submitting}
                  onClick={() => respond("approve")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="btn px-4 py-2 text-sm"
                  disabled={submitting}
                  onClick={() => respond("revision")}
                >
                  Request revision
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-4 py-2 text-sm"
                  disabled={submitting}
                  onClick={() => respond("reject")}
                >
                  Decline
                </button>
              </FormActions>
            </SectionCard>
          )}
        </>
      )}
    </PublicFrame>
  );
}
