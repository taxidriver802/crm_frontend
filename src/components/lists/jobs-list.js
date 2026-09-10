"use client";

import { ReturnLink } from "@/components/return-to";
import { StatusBadge } from "@/components/ui/status-badge";
import { HealthBadge } from "@/components/ui/health-badge";
import {
  EntityList,
  EntityListAssignee,
  EntityListMeta,
  EntityListMetaStrip,
  EntityListPrimary,
  EntityListRow,
  formatAssigneeName,
} from "@/components/ui/entity-list";
import { formatDate, formatDaysInStatus } from "@/lib/helper";

function JobRow({
  job,
  canViewAll,
  teamUsers,
  onOpen,
  onAssign,
  onShowAddress,
  variant = "card",
}) {
  const daysInStatus = formatDaysInStatus(job.status_changed_at);

  return (
    <EntityListRow
      variant={variant}
      ariaLabel={`${job.title}${job.lead?.name ? `, lead ${job.lead.name}` : ""}, status ${job.status}`}
      onOpen={() => onOpen(job.id)}
    >
      <EntityListPrimary
        title={job.title}
        subtitle={job.description || null}
        badges={
          <>
            <StatusBadge kind="job" status={job.status} />
            <HealthBadge health={job.health} />
          </>
        }
      />

      <EntityListMetaStrip>
        {job.lead ? (
          <EntityListMeta label="Lead">
            <ReturnLink
              className="underline underline-offset-4 hover:opacity-80"
              href={`/leads/${job.lead.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {job.lead.name}
            </ReturnLink>
          </EntityListMeta>
        ) : null}

        {job.address ? (
          <EntityListMeta label="Address" className="max-w-full sm:max-w-[22rem]">
            <button
              type="button"
              className="hover:text-main truncate text-left underline decoration-dotted underline-offset-4"
              title="Show full address"
              onClick={(e) => {
                e.stopPropagation();
                onShowAddress(job.address);
              }}
            >
              {job.address}
            </button>
          </EntityListMeta>
        ) : null}

        <EntityListMeta label="Created">{formatDate(job.created_at)}</EntityListMeta>

        {daysInStatus ? (
          <span className="text-muted text-xs">{daysInStatus}</span>
        ) : null}

        <EntityListAssignee
          canEdit={canViewAll}
          value={job.assigned_to}
          teamUsers={teamUsers}
          displayName={formatAssigneeName(job.assigned_user)}
          ariaLabel={`Assignee for ${job.title}`}
          onAssign={(assignedTo) => onAssign(job.id, assignedTo)}
        />
      </EntityListMetaStrip>
    </EntityListRow>
  );
}

export function JobsList({
  jobs,
  loading,
  canViewAll,
  teamUsers = [],
  onOpen,
  onAssign,
  onShowAddress,
  layout = "stack",
}) {
  const rowVariant = layout === "flush" ? "flush" : "card";

  return (
    <EntityList layout={layout} loading={loading} emptyTitle="No jobs found">
      {jobs.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          canViewAll={canViewAll}
          teamUsers={teamUsers}
          onOpen={onOpen}
          onAssign={onAssign}
          onShowAddress={onShowAddress}
          variant={rowVariant}
        />
      ))}
    </EntityList>
  );
}
