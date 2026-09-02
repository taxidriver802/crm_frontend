"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/error-boundary";

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString();
}

export function NotesSection({ entityType, entityId, onLoadState }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadNotes() {
      if (!entityId) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          entity_type: entityType,
          entity_id: String(entityId),
        });
        const res = await api(`/notes?${params.toString()}`);
        if (!alive) return;
        setNotes(res.notes || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load notes");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadNotes();
    return () => {
      alive = false;
    };
  }, [entityType, entityId]);

  useEffect(() => {
    onLoadState?.({ ready: !loading, empty: notes.length === 0 });
  }, [loading, notes.length, onLoadState]);

  async function handleCreateNote(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      const res = await api("/notes", {
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: Number(entityId),
          body: trimmed,
        }),
      });
      setNotes((prev) => [res.note, ...prev]);
      setBody("");
    } catch (e) {
      setError(e?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId) {
    const ok = window.confirm("Delete this note?");
    if (!ok) return;

    try {
      await api(`/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (e) {
      setError(e?.message || "Failed to delete note");
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      <form onSubmit={handleCreateNote} className="space-y-2">
        <Field label="Add note">
          <textarea
            className="input min-h-[90px] resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Log call notes, decisions, or follow-up context..."
            maxLength={2000}
          />
        </Field>
        <FormActions className="justify-between">
          <span className="text-muted text-xs">{body.length}/2000</span>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={saving || !body.trim()}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </FormActions>
      </form>

      {loading ? (
        <div className="text-muted text-sm">Loading notes...</div>
      ) : notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Add the first note above." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <ListRow key={note.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{note.author_name || "User"}</div>
                <div className="text-muted text-xs">
                  {formatRelativeTime(note.created_at)}
                </div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{note.body}</div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-muted text-xs underline hover:text-danger"
                  onClick={() => handleDeleteNote(note.id)}
                >
                  Delete
                </button>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
