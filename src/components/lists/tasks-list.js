"use client";

import Link from "next/link";
import { ReturnLink } from "@/components/return-to";
import { LinkedEntityCell } from "@/components/linked-entity-cell";
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
import { formatTaskSchedule } from "@/lib/helper";

function TaskRow({
  task,
  canViewAll,
  teamUsers,
  onOpen,
  onAssign,
  menuOpen,
  actionsMenuPosition,
  onToggleActions,
  onCloseActions,
  onSetStatus,
}) {
  const isCompleted = task.status === "Completed";
  const title = (
    <>
      {task.title}
      {task.kind === "appointment" ? (
        <span className="text-muted ml-2 text-xs font-normal">Appt</span>
      ) : null}
    </>
  );

  return (
    <EntityListRow
      ariaLabel={`${task.title}, status ${task.status}`}
      onOpen={() => onOpen(task.id)}
    >
      <EntityListPrimary
        title={title}
        subtitle={task.description || null}
        badges={<StatusBadge kind="task" status={task.status} />}
      />

      <EntityListMetaStrip>
        <div
          className="flex min-w-0 items-start gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="text-muted mt-0.5 shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.06em]">
            Linked
          </span>
          <LinkedEntityCell task={task} />
        </div>

        <EntityListMeta label="Due">{formatTaskSchedule(task)}</EntityListMeta>

        <EntityListAssignee
          canEdit={canViewAll}
          value={task.assigned_to}
          teamUsers={teamUsers}
          displayName={formatAssigneeName(task.assigned_user)}
          ariaLabel={`Assignee for ${task.title}`}
          onAssign={(assignedTo) => onAssign(task.id, assignedTo)}
        />

        <div
          className="relative flex items-center sm:ml-0"
          data-task-actions-menu={task.id}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn flex items-center gap-1 px-3 py-1.5 text-xs"
            aria-label={`Actions for ${task.title}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={(e) => onToggleActions(task.id, e.currentTarget)}
          >
            Actions
            <span className="text-muted" aria-hidden>
              ▾
            </span>
          </button>

          {menuOpen && actionsMenuPosition ? (
            <div
              role="menu"
              aria-label={`Actions for ${task.title}`}
              className="dropdown-panel fixed z-dialog min-w-[12rem] overflow-hidden py-1 shadow-lg"
              style={{
                top: actionsMenuPosition.top,
                left: actionsMenuPosition.left,
                width: actionsMenuPosition.width,
              }}
            >
              <ReturnLink
                href={`/tasks/${task.id}`}
                role="menuitem"
                className="hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left text-xs transition-colors"
                onClick={onCloseActions}
              >
                Open
              </ReturnLink>
              <Link
                href={`/tasks/${task.id}/edit`}
                role="menuitem"
                className="hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left text-xs transition-colors"
                onClick={onCloseActions}
              >
                Edit
              </Link>
              <button
                type="button"
                role="menuitem"
                className="hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left text-xs transition-colors"
                onClick={() => {
                  onCloseActions();
                  onSetStatus(task.id, isCompleted ? "Pending" : "Completed");
                }}
              >
                {isCompleted ? "Mark pending" : "Mark completed"}
              </button>
            </div>
          ) : null}
        </div>
      </EntityListMetaStrip>
    </EntityListRow>
  );
}

export function TasksList({
  tasks,
  loading,
  canViewAll,
  teamUsers = [],
  onOpen,
  onAssign,
  openActionsTaskId,
  actionsMenuPosition,
  onToggleActions,
  onCloseActions,
  onSetStatus,
  emptyDescription = "Try adjusting filters or create a new task.",
}) {
  return (
    <EntityList
      loading={loading}
      emptyTitle="No tasks found"
      emptyDescription={emptyDescription}
    >
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          canViewAll={canViewAll}
          teamUsers={teamUsers}
          onOpen={onOpen}
          onAssign={onAssign}
          menuOpen={openActionsTaskId === task.id}
          actionsMenuPosition={actionsMenuPosition}
          onToggleActions={onToggleActions}
          onCloseActions={onCloseActions}
          onSetStatus={onSetStatus}
        />
      ))}
    </EntityList>
  );
}
