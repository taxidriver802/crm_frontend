"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { sameFilters } from "@/lib/url-filters";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/icons";

function setViewParam(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("view", String(id));
  else url.searchParams.delete("view");
  window.history.replaceState(null, "", url.toString());
}

/**
 * Named filter sets for a list. The active view is `?view=<id>` in the URL,
 * so a view can be linked and pinned to the sidebar; opening that link
 * applies the view's filters. Changing a filter afterwards leaves the view
 * (the URL drops `view`), so the label never claims rows it is not showing.
 *
 * `onApplyFilters(saved)` applies a saved filter object and returns the
 * filters as the page now holds them (the same shape as `currentFilters`).
 */
export function SavedViewsControls({ entityType, listPath, currentFilters, onApplyFilters }) {
  const { askConfirm, confirmModal } = useConfirmModal();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || "";
  const [views, setViews] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isNaming, setIsNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [inlineError, setInlineError] = useState("");
  const nameInputRef = useRef(null);
  const appliedRef = useRef({ id: "", filters: null });

  async function loadViews() {
    try {
      const res = await api(`/saved-views?entityType=${encodeURIComponent(entityType)}`);
      setViews(res.views || []);
    } catch {
      setViews([]);
    }
  }

  useEffect(() => {
    let alive = true;
    api(`/saved-views?entityType=${encodeURIComponent(entityType)}`)
      .then((res) => {
        if (alive) setViews(res.views || []);
      })
      .catch(() => {
        if (alive) setViews([]);
      });
    return () => {
      alive = false;
    };
  }, [entityType]);

  const activeView = useMemo(
    () => (views || []).find((view) => String(view.id) === viewParam) || null,
    [views, viewParam],
  );

  // Leaving the view: a filter changed after it was applied.
  useEffect(() => {
    const applied = appliedRef.current;
    if (!viewParam || applied.id !== viewParam || !applied.filters) return;
    if (!sameFilters(applied.filters, currentFilters)) {
      appliedRef.current = { id: "", filters: null };
      setViewParam(null);
    }
  }, [currentFilters, viewParam]);

  // Entering a view: from the picker, a pinned link, or a shared URL.
  useEffect(() => {
    if (!viewParam || views === null) return;
    if (appliedRef.current.id === viewParam) return;
    if (!activeView) {
      setViewParam(null);
      return;
    }
    const applied = onApplyFilters?.(activeView.filters || {}) || activeView.filters || {};
    appliedRef.current = { id: viewParam, filters: applied };
  }, [viewParam, views, activeView, onApplyFilters]);

  useEffect(() => {
    if (isNaming) nameInputRef.current?.focus();
  }, [isNaming]);

  async function submitSaveCurrent() {
    const name = draftName.trim();
    if (!name) {
      setInlineError("Give the view a name.");
      return;
    }
    setBusy(true);
    setInlineError("");
    try {
      const res = await api("/saved-views", {
        method: "POST",
        body: JSON.stringify({ entity_type: entityType, name, filters: currentFilters }),
      });
      await loadViews();
      if (res?.view?.id) {
        appliedRef.current = { id: String(res.view.id), filters: currentFilters };
        setViewParam(res.view.id);
      }
      setDraftName("");
      setIsNaming(false);
    } catch (e) {
      setInlineError(e?.message || "Could not save the view");
    } finally {
      setBusy(false);
    }
  }

  function deleteActive() {
    if (!activeView) return;
    askConfirm({
      title: `Delete "${activeView.name}"?`,
      description: "The filters on screen stay as they are. Anyone it was pinned for loses the pin.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        setBusy(true);
        try {
          await api(`/saved-views/${activeView.id}`, { method: "DELETE" });
          if (workspace.isPinned("view", activeView.id)) {
            workspace.togglePin({ kind: "view", id: activeView.id, label: activeView.name });
          }
          appliedRef.current = { id: "", filters: null };
          setViewParam(null);
          await loadViews();
        } catch (e) {
          setInlineError(e?.message || "Could not delete the view");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  const pinned = activeView ? workspace.isPinned("view", activeView.id) : false;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2" data-testid="saved-views">
      {isNaming ? (
        <input
          ref={nameInputRef}
          className="input w-full min-w-0 sm:w-auto sm:min-w-[180px]"
          placeholder="Name this view"
          aria-label="View name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSaveCurrent();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setIsNaming(false);
              setDraftName("");
              setInlineError("");
            }
          }}
        />
      ) : (
        <select
          className="input w-full min-w-0 sm:w-auto sm:min-w-[180px]"
          aria-label="Saved views"
          value={activeView ? String(activeView.id) : ""}
          disabled={views === null || busy}
          onChange={(e) => {
            appliedRef.current = { id: "", filters: null };
            setViewParam(e.target.value || null);
          }}
        >
          <option value="">{views === null ? "Loading views…" : "Saved views"}</option>
          {(views || []).map((view) => (
            <option key={view.id} value={view.id}>
              {view.name}
            </option>
          ))}
        </select>
      )}

      {isNaming ? (
        <>
          <button type="button" className="btn btn-sm btn-primary" onClick={submitSaveCurrent} disabled={busy}>
            Save
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setIsNaming(false);
              setDraftName("");
              setInlineError("");
            }}
            disabled={busy}
          >
            Cancel
          </button>
        </>
      ) : activeView ? (
        <>
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={pinned}
            disabled={busy}
            onClick={() =>
              workspace.togglePin({
                kind: "view",
                id: activeView.id,
                label: activeView.name,
                href: `${listPath}?view=${activeView.id}`,
              })
            }
          >
            <Icon name="pin" className="h-3.5 w-3.5" />
            {pinned ? "Pinned" : "Pin view"}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={deleteActive} disabled={busy}>
            Delete view
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setIsNaming(true);
            setInlineError("");
          }}
          disabled={busy}
        >
          Save view
        </button>
      )}

      {inlineError ? (
        <Alert variant="inline" className="text-xs">
          {inlineError}
        </Alert>
      ) : null}
      {confirmModal}
    </div>
  );
}
