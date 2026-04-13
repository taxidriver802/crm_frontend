"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";

export function KanbanColumn({ status, leads }) {
  const droppableId = `column:${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: "column", status },
  });

  const itemIds = leads.map((lead) => `lead:${lead.id}`);

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "kanban-column-over" : ""}`}
    >
      <div className="border-base mb-3 flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-semibold">{status}</h3>
        <span className="text-muted text-xs">{leads.length}</span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {leads.length === 0 ? (
            <div className="text-muted rounded-md border border-dashed p-3 text-xs">
              Drop lead here
            </div>
          ) : (
            leads.map((lead) => <KanbanCard key={lead.id} lead={lead} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}
