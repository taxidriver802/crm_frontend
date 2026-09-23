"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { useReturnPush } from "@/components/return-to";
import { formatDate, formatDaysInStatus } from "@/lib/helper";
import { formatPhoneDisplay } from "@/lib/input-format";

export function KanbanCard({ lead }) {
  const push = useReturnPush();
  const sortableId = `lead:${lead.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sortableId,
      data: {
        type: "lead",
        leadId: lead.id,
        status: lead.status,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const aging = formatDaysInStatus(lead.status_changed_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? "kanban-card-dragging" : ""}`}
      role="link"
      tabIndex={0}
      onClick={() => {
        if (!isDragging) {
          push(`/leads/${lead.id}`);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDragging) {
          e.preventDefault();
          push(`/leads/${lead.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">
          {lead.first_name} {lead.last_name}
        </div>
        <button
          type="button"
          className="kanban-drag-handle"
          aria-label={`Drag ${lead.first_name} ${lead.last_name}`}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          Drag
        </button>
      </div>
      <div className="mt-1 text-xs text-muted">
        {(lead.email ?? "—") +
          (lead.phone ? ` • ${formatPhoneDisplay(lead.phone)}` : "")}
      </div>
      <div className="mt-2 text-xs text-muted">
        {lead.source || "Unknown source"} • {formatDate(lead.created_at)}
      </div>
      {aging ? <div className="mt-1 text-xs text-muted">{aging}</div> : null}
      {lead.urgency ? (
        <div className="mt-1 text-xs text-muted">{lead.urgency}</div>
      ) : null}
      <div className="mt-1 text-xs text-muted">
        Assignee:{" "}
        {lead.assigned_user
          ? `${lead.assigned_user.first_name || ""} ${lead.assigned_user.last_name || ""}`.trim() ||
            lead.assigned_user.email
          : "Unassigned"}
      </div>
    </div>
  );
}
