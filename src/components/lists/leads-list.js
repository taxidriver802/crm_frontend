"use client";

import { StatusBadge } from "@/components/ui/status-badge";
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

function LeadRow({ lead, canViewAll, teamUsers, onOpen, onAssign }) {
  const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Lead";
  const contact =
    (lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "");
  const daysInStatus = formatDaysInStatus(lead.status_changed_at);

  return (
    <EntityListRow
      ariaLabel={`${name}, status ${lead.status}`}
      onOpen={() => onOpen(lead.id)}
    >
      <EntityListPrimary
        title={name}
        subtitle={contact}
        badges={<StatusBadge kind="lead" status={lead.status} />}
      />

      <EntityListMetaStrip>
        <EntityListMeta label="Source">{lead.source ?? "—"}</EntityListMeta>
        <EntityListMeta label="Created">{formatDate(lead.created_at)}</EntityListMeta>
        {daysInStatus ? (
          <span className="text-muted text-xs">{daysInStatus}</span>
        ) : null}
        <EntityListAssignee
          canEdit={canViewAll}
          value={lead.assigned_to}
          teamUsers={teamUsers}
          displayName={formatAssigneeName(lead.assigned_user)}
          ariaLabel={`Assignee for ${name}`}
          onAssign={(assignedTo) => onAssign(lead.id, assignedTo)}
        />
      </EntityListMetaStrip>
    </EntityListRow>
  );
}

export function LeadsList({
  leads,
  loading,
  canViewAll,
  teamUsers = [],
  onOpen,
  onAssign,
}) {
  return (
    <EntityList loading={loading} emptyTitle="No leads found">
      {leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          canViewAll={canViewAll}
          teamUsers={teamUsers}
          onOpen={onOpen}
          onAssign={onAssign}
        />
      ))}
    </EntityList>
  );
}
