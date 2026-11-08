"use client";

import { PeekLink } from "@/components/peek/peek-provider";
import { HealthDot, StatusPill } from "@/components/records/record-bits";
import { formatDate, formatDaysInStatus, formatTaskSchedule } from "@/lib/helper";
import { INVOICE_KIND_LABEL, formatMoney } from "@/lib/job-lifecycle";
import { cx } from "@/lib/cx";

/**
 * Column catalogues for the four work lists. Each list shows its `default`
 * columns until a person picks their own (Display menu); `required` columns
 * cannot be hidden. Sorting uses `sortValue`.
 */

function personName(user) {
  if (!user) return null;
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || null;
}

function Muted({ children }) {
  return <span className="text-muted">{children ?? "—"}</span>;
}

/* ------------------------------------------------------------------ */

export const JOB_COLUMNS = [
  {
    id: "title",
    label: "Job",
    required: true,
    sortValue: (row) => row.title?.toLowerCase(),
    render: (row) => (
      <span className="block min-w-0">
        <PeekLink kind="job" id={row.id} className="cell-title">
          {row.title}
        </PeekLink>
        <span className="cell-sub">{[row.lead?.name, row.address].filter(Boolean).join(" · ") || "—"}</span>
      </span>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortValue: (row) => row.status,
    render: (row) => <StatusPill kind="job" status={row.status} />,
  },
  {
    id: "next",
    label: "Next step",
    sortValue: (row) => row.next_step?.label,
    render: (row) =>
      row.next_step && row.next_step.action !== "none" ? (
        <span className="cell-clip text-main" title={row.next_step.label}>
          {row.next_step.label}
        </span>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "health",
    label: "Health",
    sortValue: (row) => ({ red: 0, yellow: 1, green: 2 })[row.health?.level] ?? 3,
    render: (row) =>
      row.health && row.health.level !== "none" ? (
        <span className="cell-clip">
          <HealthDot health={row.health} withLabel />
        </span>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "assignee",
    label: "Owner",
    sortValue: (row) => personName(row.assigned_user),
    render: (row) => <Muted>{personName(row.assigned_user) || "Unassigned"}</Muted>,
  },
  {
    id: "owed",
    label: "Owed",
    align: "right",
    sortValue: (row) => row.money?.outstanding_total ?? 0,
    render: (row) =>
      row.money?.outstanding_total > 0 ? (
        <span className={cx("font-medium", row.money.overdue_total > 0 && "text-danger")}>
          {formatMoney(row.money.outstanding_total)}
        </span>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "age",
    label: "In status",
    default: false,
    sortValue: (row) => row.days_in_status ?? 0,
    render: (row) => <Muted>{formatDaysInStatus(row.status_changed_at) || "—"}</Muted>,
  },
  {
    id: "contract",
    label: "Contract",
    align: "right",
    default: false,
    sortValue: (row) => row.money?.contract_total ?? 0,
    render: (row) =>
      row.money?.contract_total > 0 ? formatMoney(row.money.contract_total) : <Muted>—</Muted>,
  },
  {
    id: "client",
    label: "Client",
    default: false,
    sortValue: (row) => row.lead?.name,
    render: (row) =>
      row.lead ? (
        <PeekLink kind="lead" id={row.lead.id} className="hover:text-accent">
          {row.lead.name}
        </PeekLink>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "address",
    label: "Address",
    default: false,
    sortValue: (row) => row.address,
    render: (row) => <Muted>{row.address}</Muted>,
  },
  {
    id: "created",
    label: "Created",
    default: false,
    sortValue: (row) => new Date(row.created_at).getTime(),
    render: (row) => <Muted>{formatDate(row.created_at)}</Muted>,
  },
];

/* ------------------------------------------------------------------ */

function leadName(row) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || `Lead #${row.id}`;
}

export const LEAD_COLUMNS = [
  {
    id: "name",
    label: "Lead",
    required: true,
    sortValue: (row) => leadName(row).toLowerCase(),
    render: (row) => (
      <span className="block min-w-0">
        <PeekLink kind="lead" id={row.id} className="cell-title">
          {leadName(row)}
        </PeekLink>
        <span className="cell-sub">{[row.service_type, row.email].filter(Boolean).join(" · ") || "—"}</span>
      </span>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortValue: (row) => row.status,
    render: (row) => <StatusPill kind="lead" status={row.status} />,
  },
  {
    id: "phone",
    label: "Phone",
    sortValue: (row) => row.phone,
    render: (row) =>
      row.phone ? (
        <a href={`tel:${String(row.phone).replace(/[^\d+]/g, "")}`} className="hover:text-accent">
          {row.phone}
        </a>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "source",
    label: "Source",
    sortValue: (row) => row.source,
    render: (row) => <Muted>{row.source}</Muted>,
  },
  {
    id: "assignee",
    label: "Owner",
    sortValue: (row) => personName(row.assigned_user),
    render: (row) => <Muted>{personName(row.assigned_user) || "Unassigned"}</Muted>,
  },
  {
    id: "age",
    label: "In status",
    sortValue: (row) => new Date(row.status_changed_at || row.created_at).getTime() * -1,
    render: (row) => <Muted>{formatDaysInStatus(row.status_changed_at) || "—"}</Muted>,
  },
  {
    id: "email",
    label: "Email",
    default: false,
    sortValue: (row) => row.email,
    render: (row) => <Muted>{row.email}</Muted>,
  },
  {
    id: "urgency",
    label: "Urgency",
    default: false,
    sortValue: (row) => row.urgency,
    render: (row) => <Muted>{row.urgency}</Muted>,
  },
  {
    id: "budget",
    label: "Budget",
    align: "right",
    default: false,
    sortValue: (row) => Number(row.budget_max ?? row.budget_min ?? 0),
    render: (row) =>
      row.budget_max != null || row.budget_min != null ? (
        <span>{formatMoney(row.budget_max ?? row.budget_min)}</span>
      ) : (
        <Muted>—</Muted>
      ),
  },
  {
    id: "created",
    label: "Created",
    default: false,
    sortValue: (row) => new Date(row.created_at).getTime(),
    render: (row) => <Muted>{formatDate(row.created_at)}</Muted>,
  },
];

/* ------------------------------------------------------------------ */

export const INVOICE_COLUMNS = [
  {
    id: "number",
    label: "Invoice",
    required: true,
    sortValue: (row) => row.invoice_number,
    render: (row) => (
      <span className="block min-w-0">
        <PeekLink kind="invoice" id={row.id} className="cell-title num">
          {row.invoice_number}
        </PeekLink>
        <span className="cell-sub">{row.job_title || `Job #${row.job_id}`}</span>
      </span>
    ),
  },
  {
    id: "client",
    label: "Client",
    sortValue: (row) => row.lead_name,
    render: (row) => <Muted>{row.lead_name}</Muted>,
  },
  {
    id: "status",
    label: "Status",
    sortValue: (row) => row.status,
    render: (row) => <StatusPill kind="invoice" status={row.status} />,
  },
  {
    id: "total",
    label: "Total",
    align: "right",
    sortValue: (row) => row.grand_total,
    render: (row) => formatMoney(row.grand_total),
  },
  {
    id: "balance",
    label: "Balance",
    align: "right",
    sortValue: (row) => (row.status === "Draft" || row.status === "Void" ? -1 : row.balance_due),
    render: (row) =>
      row.status === "Draft" || row.status === "Void" ? (
        <Muted>—</Muted>
      ) : (
        <span className={cx("font-medium", row.status === "Overdue" && "text-danger")}>
          {formatMoney(row.balance_due)}
        </span>
      ),
  },
  {
    id: "due",
    label: "Due",
    sortValue: (row) => (row.due_date ? new Date(row.due_date).getTime() : null),
    render: (row) => <Muted>{row.due_date ? formatDate(row.due_date) : "—"}</Muted>,
  },
  {
    id: "kind",
    label: "Kind",
    default: false,
    sortValue: (row) => row.kind,
    render: (row) => <Muted>{INVOICE_KIND_LABEL[row.kind] || "Invoice"}</Muted>,
  },
  {
    id: "paid",
    label: "Paid",
    align: "right",
    default: false,
    sortValue: (row) => row.amount_paid,
    render: (row) => (row.amount_paid > 0 ? formatMoney(row.amount_paid) : <Muted>—</Muted>),
  },
  {
    id: "sent",
    label: "Sent",
    default: false,
    sortValue: (row) => (row.sent_at ? new Date(row.sent_at).getTime() : null),
    render: (row) => <Muted>{row.sent_at ? formatDate(row.sent_at) : "—"}</Muted>,
  },
];

/* ------------------------------------------------------------------ */

function isLateTask(task) {
  if (task.status === "Completed" || !task.due_date) return false;
  return new Date(task.end_at || task.due_date).getTime() < Date.now();
}

export function buildTaskColumns({ onToggle } = {}) {
  return [
    {
      id: "title",
      label: "Task",
      required: true,
      sortValue: (row) => row.title?.toLowerCase(),
      render: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          {onToggle ? (
            <input
              type="checkbox"
              aria-label={`${row.status === "Completed" ? "Reopen" : "Complete"} ${row.title}`}
              checked={row.status === "Completed"}
              onChange={() => onToggle(row)}
            />
          ) : null}
          <span className="block min-w-0">
            <PeekLink
              kind="task"
              id={row.id}
              className={cx("cell-title", row.status === "Completed" && "text-muted line-through")}
            >
              {row.title}
            </PeekLink>
            <span className="cell-sub">
              {row.job_title || row.lead?.name || row.job_lead?.name || (row.job_id ? `Job #${row.job_id}` : "—")}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: "due",
      label: "When",
      sortValue: (row) => (row.due_date ? new Date(row.due_date).getTime() : null),
      render: (row) => (
        <span className={cx(isLateTask(row) ? "text-danger font-medium" : "text-muted")}>
          {row.due_date ? formatTaskSchedule(row) : "No date"}
        </span>
      ),
    },
    {
      id: "kind",
      label: "Kind",
      sortValue: (row) => row.kind,
      render: (row) => <Muted>{row.kind === "appointment" ? "Appointment" : "Task"}</Muted>,
    },
    {
      id: "status",
      label: "Status",
      sortValue: (row) => row.status,
      render: (row) =>
        isLateTask(row) ? (
          <span className="pill pill-danger">
            <span className="pill-dot" aria-hidden />
            Overdue
          </span>
        ) : (
          <StatusPill kind="task" status={row.status} />
        ),
    },
    {
      id: "assignee",
      label: "Owner",
      sortValue: (row) => personName(row.assigned_user),
      render: (row) => <Muted>{personName(row.assigned_user) || "Unassigned"}</Muted>,
    },
    {
      id: "location",
      label: "Where",
      default: false,
      sortValue: (row) => row.location,
      render: (row) => <Muted>{row.location}</Muted>,
    },
    {
      id: "created",
      label: "Created",
      default: false,
      sortValue: (row) => new Date(row.created_at).getTime(),
      render: (row) => <Muted>{formatDate(row.created_at)}</Muted>,
    },
  ];
}
