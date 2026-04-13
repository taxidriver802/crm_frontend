"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";

function getStatusFromOver(overId, leadsById) {
  if (!overId) return null;
  if (overId.startsWith("column:")) {
    return overId.replace("column:", "");
  }
  if (overId.startsWith("lead:")) {
    const leadId = Number(overId.replace("lead:", ""));
    return leadsById.get(leadId)?.status ?? null;
  }
  return null;
}

export function KanbanBoard({ leads, columns, onMove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const normalizedColumns = columns.filter(Boolean);
  const leadStatuses = new Set(normalizedColumns);

  for (const lead of leads) {
    if (lead.status && !leadStatuses.has(lead.status)) {
      leadStatuses.add(lead.status);
    }
  }

  const columnList = Array.from(leadStatuses);

  async function handleDragEnd(event) {
    const activeId = String(event.active?.id || "");
    const overId = String(event.over?.id || "");
    if (!activeId.startsWith("lead:") || !overId) return;

    const leadId = Number(activeId.replace("lead:", ""));
    const lead = leadsById.get(leadId);
    if (!lead) return;

    const nextStatus = getStatusFromOver(overId, leadsById);
    if (!nextStatus || nextStatus === lead.status) return;

    await onMove(leadId, nextStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board scrollbar-theme">
        {columnList.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter((lead) => lead.status === status)}
          />
        ))}
      </div>
    </DndContext>
  );
}
