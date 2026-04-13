"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/helper";

export function KanbanCard({ lead }) {
  const router = useRouter();
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card hover:bg-accent cursor-pointer ${isDragging ? "opacity-60" : ""}`}
      role="link"
      tabIndex={0}
      onClick={() => {
        if (!isDragging) {
          router.push(`/leads/${lead.id}`);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDragging) {
          e.preventDefault();
          router.push(`/leads/${lead.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">
          {lead.first_name} {lead.last_name}
        </div>
        <button
          type="button"
          className="text-muted cursor-grab rounded border px-1.5 py-0.5 text-[10px] active:cursor-grabbing"
          aria-label={`Drag ${lead.first_name} ${lead.last_name}`}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          Drag
        </button>
      </div>
      <div className="text-muted mt-1 text-xs">
        {(lead.email ?? "—") + (lead.phone ? ` • ${lead.phone}` : "")}
      </div>
      <div className="text-muted mt-2 text-xs">
        {lead.source || "Unknown source"} • {formatDate(lead.created_at)}
      </div>
      <div className="text-muted mt-1 text-xs">
        Assignee:{" "}
        {lead.assigned_user
          ? `${lead.assigned_user.first_name || ""} ${lead.assigned_user.last_name || ""}`.trim() ||
            lead.assigned_user.email
          : "Unassigned"}
      </div>
    </div>
  );
}
