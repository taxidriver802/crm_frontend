"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Menu, MenuDivider, MenuItem, MenuLabel } from "@/components/ui/menu";
import { cx } from "@/lib/cx";

/** What "Create" offers from where you are standing. */
export function createItemsFor(entityContext) {
  const contextual = [];
  if (entityContext?.type === "job") {
    const id = entityContext.id;
    contextual.push(
      { key: "job-task", label: "Task on this job", icon: "checklist", href: `/tasks/new?job_id=${id}` },
      {
        key: "job-appt",
        label: "Appointment on this job",
        icon: "calendar",
        href: `/tasks/new?job_id=${id}&kind=appointment`,
      },
      { key: "job-est", label: "Estimate for this job", icon: "invoice", href: `/estimates/new?job_id=${id}` },
      { key: "job-inv", label: "Invoice for this job", icon: "dollar", href: `/invoices/new?job_id=${id}` },
    );
  } else if (entityContext?.type === "lead") {
    const id = entityContext.id;
    contextual.push(
      { key: "lead-job", label: "Job for this lead", icon: "briefcase", href: `/jobs/new?lead_id=${id}` },
      { key: "lead-task", label: "Task for this lead", icon: "checklist", href: `/tasks/new?lead_id=${id}` },
      {
        key: "lead-appt",
        label: "Appointment with this lead",
        icon: "calendar",
        href: `/tasks/new?lead_id=${id}&kind=appointment`,
      },
    );
  }
  const general = [
    { key: "lead", label: "Lead", icon: "users", href: "/leads/new", hint: "L" },
    { key: "job", label: "Job", icon: "briefcase", href: "/jobs/new", hint: "J" },
    { key: "task", label: "Task", icon: "checklist", href: "/tasks/new", hint: "T" },
    { key: "appt", label: "Appointment", icon: "calendar", href: "/tasks/new?kind=appointment", hint: "A" },
    { key: "estimate", label: "Estimate", icon: "invoice", href: "/estimates/new", hint: "E" },
    { key: "invoice", label: "Invoice", icon: "dollar", href: "/invoices/new", hint: "I" },
  ];
  return { contextual, general };
}

export function CreateMenu({ entityContext, open, onOpenChange, compact = false, side = "bottom", align = "start" }) {
  const router = useRouter();
  const { contextual, general } = createItemsFor(entityContext);

  function onPanelKey(event, close) {
    const key = event.key?.toUpperCase();
    const match = general.find((item) => item.hint === key);
    if (match && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      close();
      router.push(match.href);
    }
  }

  return (
    <Menu
      open={open}
      onOpenChange={onOpenChange}
      align={align}
      side={side}
      label="Create"
      className="w-64"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className={cx("create-btn", compact && "create-btn-compact")}
          aria-label="Create"
          title="Create (C)"
        >
          <Icon name="plus" className="h-4 w-4" />
          {compact ? null : (
            <>
              <span>Create</span>
              <kbd className="kbd ml-auto">C</kbd>
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div onKeyDown={(event) => onPanelKey(event, close)}>
          {contextual.length > 0 ? (
            <>
              <MenuLabel>Here</MenuLabel>
              {contextual.map((item) => (
                <MenuItem
                  key={item.key}
                  icon={<Icon name={item.icon} className="h-4 w-4 text-muted" />}
                  onSelect={() => {
                    close();
                    router.push(item.href);
                  }}
                >
                  {item.label}
                </MenuItem>
              ))}
              <MenuDivider />
            </>
          ) : null}
          <MenuLabel>New</MenuLabel>
          {general.map((item) => (
            <MenuItem
              key={item.key}
              icon={<Icon name={item.icon} className="h-4 w-4 text-muted" />}
              hint={item.hint}
              onSelect={() => {
                close();
                router.push(item.href);
              }}
            >
              {item.label}
            </MenuItem>
          ))}
        </div>
      )}
    </Menu>
  );
}
