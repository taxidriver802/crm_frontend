"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ModalFrame } from "@/components/ui/overlay";
import { NAV_ITEMS } from "@/lib/preferences";
import { useModKey } from "@/lib/mod-key";

const GO_KEYS = {
  h: "/dashboard",
  j: "/jobs",
  l: "/leads",
  t: "/tasks",
  i: "/invoices",
  n: "/notifications",
  r: "/reports",
  s: "/settings",
};

/**
 * `keys` are real keys, each drawn as its own keycap. "mod" is ⌘ or Ctrl.
 * `gesture` is a phrase (not a chord) and stays one piece of text, so
 * "Click a row" is not three boxes that can wrap apart.
 */
export const SHORTCUT_GROUPS = [
  {
    title: "Anywhere",
    items: [
      { keys: ["mod", "K"], label: "Search and run commands" },
      { keys: ["/"], label: "Search" },
      { keys: ["C"], label: "Create something" },
      { keys: ["["], label: "Collapse or expand the sidebar" },
      { keys: ["?"], label: "This list" },
      { keys: ["Esc"], label: "Close a preview, menu or dialog" },
    ],
  },
  {
    title: "Go to",
    items: [
      { keys: ["G", "H"], label: "Today" },
      { keys: ["G", "J"], label: "Jobs" },
      { keys: ["G", "L"], label: "Leads" },
      { keys: ["G", "T"], label: "Tasks" },
      { keys: ["G", "I"], label: "Invoices" },
      { keys: ["G", "N"], label: "Inbox" },
      { keys: ["G", "R"], label: "Reports" },
      { keys: ["G", "S"], label: "Preferences" },
    ],
  },
  {
    title: "In lists",
    items: [
      { gesture: "Click a row", label: "Preview it beside the list" },
      { keys: ["mod", "Click"], label: "Open the full page in a new tab" },
      { keys: ["Shift", "Click"], label: "Select a range" },
    ],
  },
];

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.closest?.('[role="dialog"][aria-modal="true"]')
  );
}

/**
 * Global keys. Single keys only fire when you are not typing, so they never
 * steal characters from a form.
 */
export function useGlobalShortcuts({ onSearch, onCreate, onToggleRail, onHelp }) {
  const router = useRouter();
  const pendingG = useRef(0);

  useEffect(() => {
    function onKey(event) {
      const key = event.key;
      if ((event.metaKey || event.ctrlKey) && key?.toLowerCase() === "k") {
        event.preventDefault();
        onSearch?.();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (pendingG.current && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const href = GO_KEYS[key?.toLowerCase()];
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      if (key === "g" || key === "G") {
        pendingG.current = Date.now();
        return;
      }
      if (key === "/") {
        event.preventDefault();
        onSearch?.();
      } else if (key === "c" || key === "C") {
        event.preventDefault();
        onCreate?.();
      } else if (key === "[") {
        event.preventDefault();
        onToggleRail?.();
      } else if (key === "?") {
        event.preventDefault();
        onHelp?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, onSearch, onCreate, onToggleRail, onHelp]);
}

function ShortcutGroup({ group }) {
  return (
    <div>
      <div className="eyebrow mb-2">{group.title}</div>
      <dl className="space-y-1.5 text-sm">
        {group.items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-muted">{item.label}</dt>
            <dd className="shrink-0">
              <ShortcutKeys item={item} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ShortcutKeys({ item }) {
  const mod = useModKey();
  if (item.gesture) {
    return <span className="text-xs text-main">{item.gesture}</span>;
  }
  return (
    <span className="inline-flex flex-nowrap items-center gap-1">
      {item.keys.map((key) => (
        <kbd key={key} className="kbd">
          {key === "mod" ? mod : key}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsDialog({ open, onClose, onOpenHelp }) {
  if (!open) return null;
  return (
    <ModalFrame
      open
      onClose={onClose}
      layer="modal"
      labelledBy="shortcuts-title"
      panelClassName="dropdown-panel relative w-full max-w-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="shortcuts-title" className="text-base font-semibold">
          Keyboard shortcuts
        </h2>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {SHORTCUT_GROUPS.filter((group) => group.title !== "In lists").map((group) => (
          <ShortcutGroup key={group.title} group={group} />
        ))}
      </div>
      {SHORTCUT_GROUPS.filter((group) => group.title === "In lists").map((group) => (
        <div key={group.title} className="mt-6">
          <ShortcutGroup group={group} />
        </div>
      ))}
      <p className="mt-5 text-xs text-muted">
        Navigation items you hide in Preferences keep their shortcuts.{" "}
        {NAV_ITEMS.length} destinations in all.
      </p>
      {onOpenHelp ? (
        <p className="mt-2 text-sm">
          How to do a task is in{" "}
          <button type="button" className="link" onClick={onOpenHelp}>
            Help, the user guide
          </button>
          .
        </p>
      ) : null}
    </ModalFrame>
  );
}
