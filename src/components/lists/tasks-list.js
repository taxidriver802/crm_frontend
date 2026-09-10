"use client";

import Link from "next/link";
import { ReturnLink } from "@/components/return-to";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  EntityList,
  EntityListAssignee,
  EntityListBody,
  EntityListMain,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  formatAssigneeName,
} from "@/components/ui/entity-list";
import { formatTaskSchedule, getLinkedEntity } from "@/lib/helper";

function TaskLinkedContext({ task }) {
  const linked = getLinkedEntity(task);

  if (!linked?.href) {
    return (
      <span className="text-muted truncate">
        {linked?.label || "Unlinked"}
      </span>
    );
  }

  return (
    <ReturnLink
      href={linked.href}
      className="hover:text-main min-w-0 truncate underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
      title={`${linked.kind}: ${linked.label}`}
    >
      <span className="text-muted">{linked.kind}</span>
      <span className="text-muted"> · </span>
      <span>{linked.label}</span>
    </ReturnLink>
  );
}

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
  variant = "card",
}) {
  const isCompleted = task.status === "Completed";
  const title = (
    <>
      {task.title}
      {task.kind === "appointment" ? (
        <span className="text-muted ml-2 text-[0.6875rem] font-normal sm:text-xs">
          Appt
        </span>
      ) : null}
    </>
  );

  return (
    <EntityListRow
      variant={variant}
      ariaLabel={`${task.title}, status ${task.status}`}
      onOpen={() => onOpen(task.id)}
      signal={
        <StatusBadge appearance="signal" kind="task" status={task.status} />
      }
    >
      <EntityListBody>
        <EntityListMain>
          <EntityListPrimary
            title={title}
            subtitle={task.description || null}
            subtitleClassName="hidden lg:block"
          />

          <div className="mt-1.5 flex min-w-0 items-baseline gap-2 sm:mt-2 sm:gap-3">
            <div className="min-w-0 flex-1 truncate text-[0.6875rem] sm:text-xs">
              <TaskLinkedContext task={task} />
            </div>
            <span
              className="text-muted shrink-0 tabular-nums text-[0.6875rem] sm:text-xs"
              title="Due"
            >
              {formatTaskSchedule(task)}
            </span>
          </div>
        </EntityListMain>

        <EntityListTrailing
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <EntityListAssignee
            hideLabel
            canEdit={canViewAll}
            value={task.assigned_to}
            teamUsers={teamUsers}
            displayName={formatAssigneeName(task.assigned_user)}
            ariaLabel={`Assignee for ${task.title}`}
            onAssign={(assignedTo) => onAssign(task.id, assignedTo)}
          />

          <div className="relative" data-task-actions-menu={task.id}>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Actions for ${task.title}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(e) => onToggleActions(task.id, e.currentTarget)}
            >
              <Icon name="moreHorizontal" className="h-4 w-4" />
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
        </EntityListTrailing>
      </EntityListBody>
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
  layout = "stack",
}) {
  const rowVariant = layout === "flush" ? "flush" : "card";

  return (
    <EntityList
      layout={layout}
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
          variant={rowVariant}
        />
      ))}
    </EntityList>
  );
}
