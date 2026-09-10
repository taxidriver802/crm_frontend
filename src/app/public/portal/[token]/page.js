"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/helper";
import { PhotoGallery } from "@/components/photo-gallery";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { ListRow } from "@/components/ui/list-row";
import { MetaItem, MetaList } from "@/components/ui/meta";
import { EmptyState } from "@/components/error-boundary";
import { Skeleton } from "@/components/loading/loadingSkeletons";
import { PublicFrame } from "@/components/public/public-frame";

function formatDate(input) {
  if (!input) return "—";
  return new Date(input).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CustomerPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/public/portal/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "This link is invalid or has expired.");
      }
      const json = await res.json();
      setData(json.portal);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <PublicFrame eyebrow="Customer portal" title="Your project">
        <SectionCard title="Project status">
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </SectionCard>
      </PublicFrame>
    );
  }

  if (error || !data) {
    return (
      <PublicFrame eyebrow="Customer portal" title="Portal unavailable">
        <EmptyState
          title="This portal is unavailable"
          description={error || "This link is invalid or has expired."}
        />
      </PublicFrame>
    );
  }

  const { job, estimates, invoices, files, timeline = [] } = data;

  return (
    <PublicFrame
      eyebrow="Customer portal"
      title={job.title}
      description={job.address || undefined}
      footer="This portal was generated for your convenience. Contact your project manager for questions."
    >
      <SectionCard
        title="Project status"
        right={<StatusBadge kind="job" status={job.status} />}
      >
        {job.description ? (
          <p className="text-muted text-sm">{job.description}</p>
        ) : null}
        {job.lead_name ? (
          <MetaList className={job.description ? "mt-4" : ""}>
            <MetaItem label="Client">
              {job.lead_name}
              {job.lead_email ? ` · ${job.lead_email}` : ""}
            </MetaItem>
          </MetaList>
        ) : null}
      </SectionCard>

      <SectionCard title="Progress">
        {timeline.length === 0 ? (
          <EmptyState
            title="No updates yet"
            description="Project milestones will show up here as work moves forward."
          />
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => (
              <ListRow key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm font-medium">{item.label}</div>
                <div className="text-muted shrink-0 text-xs">
                  {formatDate(item.at)}
                </div>
              </ListRow>
            ))}
          </div>
        )}
      </SectionCard>

      {estimates.length > 0 ? (
        <SectionCard title="Estimates">
          <div className="space-y-2">
            {estimates.map((est) => (
              <ListRow
                key={est.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{est.title}</div>
                  <div className="text-muted mt-1 text-xs">
                    {formatDate(est.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    ${formatCurrency(est.grand_total)}
                  </span>
                  <StatusBadge kind="estimate" status={est.status} />
                </div>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {invoices.length > 0 ? (
        <SectionCard title="Invoices">
          <div className="space-y-2">
            {invoices.map((inv) => (
              <ListRow
                key={inv.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-muted mt-1 text-xs">
                    {formatDate(inv.created_at)}
                    {inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    ${formatCurrency(inv.grand_total)}
                  </span>
                  <StatusBadge kind="invoice" status={inv.status} />
                </div>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Project photos">
          <PhotoGallery
            files={files}
            loading={false}
            emptyTitle="No photos shared yet."
            emptyDescription=""
          />
        </SectionCard>
    </PublicFrame>
  );
}
