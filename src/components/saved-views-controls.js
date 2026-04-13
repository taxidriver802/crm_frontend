"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

export function SavedViewsControls({ entityType, currentFilters, onApplyFilters }) {
  const [views, setViews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isNaming, setIsNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [inlineError, setInlineError] = useState("");
  const nameInputRef = useRef(null);

  async function loadViews() {
    setLoading(true);
    try {
      const res = await api(`/saved-views?entityType=${encodeURIComponent(entityType)}`);
      setViews(res.views || []);
    } catch {
      setViews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  const selectedView = useMemo(
    () => views.find((view) => String(view.id) === String(selectedId)) || null,
    [views, selectedId],
  );

  useEffect(() => {
    if (isNaming && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isNaming]);

  async function submitSaveCurrent() {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setInlineError("Please enter a name.");
      return;
    }

    setBusy(true);
    setInlineError("");
    try {
      const res = await api("/saved-views", {
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          name: trimmedName,
          filters: currentFilters,
        }),
      });
      await loadViews();
      if (res?.view?.id) {
        setSelectedId(String(res.view.id));
      }
      setDraftName("");
      setIsNaming(false);
    } catch (e) {
      setInlineError(e?.message || "Failed to save view");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedView) return;
    if (!window.confirm(`Delete "${selectedView.name}"?`)) return;

    setBusy(true);
    try {
      await api(`/saved-views/${selectedView.id}`, { method: "DELETE" });
      setSelectedId("");
      await loadViews();
    } catch (e) {
      window.alert(e?.message || "Failed to delete view");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isNaming ? (
        <input
          ref={nameInputRef}
          className="input min-w-[180px]"
          placeholder="Saved view name"
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
          className="input min-w-[180px]"
          value={selectedId}
          disabled={loading || busy}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedId(value);
            if (!value) return;
            const view = views.find((item) => String(item.id) === String(value));
            if (view) {
              onApplyFilters?.(view.filters || {});
            }
          }}
        >
          <option value="">{loading ? "Loading views..." : "Saved views"}</option>
          {views.map((view) => (
            <option key={view.id} value={view.id}>
              {view.name}
            </option>
          ))}
        </select>
      )}

      {!isNaming ? (
        <button
          type="button"
          className="btn px-3 py-2 text-xs"
          onClick={() => {
            setIsNaming(true);
            setInlineError("");
          }}
          disabled={busy}
        >
          Save current
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn px-3 py-2 text-xs"
            onClick={submitSaveCurrent}
            disabled={busy}
          >
            Save
          </button>
          <button
            type="button"
            className="btn px-3 py-2 text-xs"
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
      )}

      <button
        type="button"
        className="btn px-3 py-2 text-xs"
        onClick={handleDeleteSelected}
        disabled={busy || !selectedView}
      >
        Delete
      </button>

      {inlineError ? <div className="text-xs text-red-500">{inlineError}</div> : null}
    </div>
  );
}
