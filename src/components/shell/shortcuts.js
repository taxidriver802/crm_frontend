"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ModalFrame } from "@/components/ui/overlay";
import { NAV_ITEMS } from "@/lib/preferences";

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

export const SHORTCUT_GROUPS = [
  {
    title: "Anywhere",
    items: [
      ["⌘ K", "Search and run commands"],
      ["/", "Search"],
      ["C", "Create something"],
      ["[", "Collapse or expand the sidebar"],
      ["?", "This list"],
      ["Esc", "Close a preview, menu or dialog"],
    ],
  },
  {
    title: "Go to",
    items: [
      ["G H", "Today"],
      ["G J", "Jobs"],
      ["G L", "Leads"],
      ["G T", "Tasks"],
      ["G I", "Invoices"],
      ["G N", "Inbox"],
      ["G R", "Reports"],
      ["G S", "Preferences"],
    ],
  },
  {
    title: "In lists",
    items: [
      ["Click a row", "Preview it beside the list"],
      ["⌘ Click", "Open the full page in a new tab"],
      ["Shift Click a box", "Select a range"],
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

export function ShortcutsDialog({ open, onClose }) {
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
      <div className="grid gap-6 sm:grid-cols-3">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="eyebrow mb-2">{group.title}</div>
            <dl className="space-y-1.5 text-sm">
              {group.items.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd>
                    {keys.split(" ").map((k) => (
                      <kbd key={k} className="kbd ml-1">
                        {k}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted">
        Navigation items you hide in Preferences keep their shortcuts.{" "}
        {NAV_ITEMS.length} destinations in all.
      </p>
    </ModalFrame>
  );
}
