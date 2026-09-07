"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useConfirmModal } from "@/components/modals/confirm-modal";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/error-boundary";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomDateTimePicker } from "@/components/forms/task-form";
import { linkifyTextParts } from "@/lib/helper";

const TYPE_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person", short: "Visit" },
  { value: "note", label: "Note" },
];

const DIRECTION_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "internal", label: "Internal" },
];

const TYPE_LABELS = {
  call: "Call",
  text: "Text",
  email: "Email",
  in_person: "In person",
  note: "Note",
};

const DIRECTION_LABELS = {
  inbound: "Inbound",
  outbound: "Outbound",
  internal: "Internal",
};

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

function NoteBody({ text }) {
  const parts = linkifyTextParts(text);
  return parts.map((part, index) =>
    part.type === "link" ? (
      <a
        key={`link-${index}`}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link break-all"
      >
        {part.value}
      </a>
    ) : (
      <span key={`text-${index}`}>{part.value}</span>
    ),
  );
}

export function NotesSection({ entityType, entityId, onLoadState }) {
  const { askConfirm, confirmModal } = useConfirmModal();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [type, setType] = useState("note");
  const [direction, setDirection] = useState("internal");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpPickerKey, setFollowUpPickerKey] = useState(0);
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
        setError(e?.message || "Failed to load communication");
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

  function handleTypeChange(nextType) {
    setType(nextType);
    if (nextType === "note") {
      setDirection("internal");
    } else if (direction === "internal") {
      setDirection("outbound");
    }
  }

  async function handleCreateNote(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        entity_type: entityType,
        entity_id: Number(entityId),
        body: trimmed,
        type,
        direction,
      };
      if (followUpDate) {
        payload.follow_up_date = followUpDate;
      }
      const res = await api("/notes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setNotes((prev) => [res.note, ...prev]);
      setBody("");
      setFollowUpDate("");
      setFollowUpPickerKey((key) => key + 1);
    } catch (e) {
      setError(e?.message || "Failed to log communication");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteNote(noteId) {
    askConfirm({
      title: "Delete this log entry?",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await api(`/notes/${noteId}`, { method: "DELETE" });
          setNotes((prev) => prev.filter((note) => note.id !== noteId));
        } catch (e) {
          setError(e?.message || "Failed to delete log entry");
        }
      },
    });
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      <form onSubmit={handleCreateNote} className="min-w-0 space-y-3">
        <Segmented
          aria-label="Communication type"
          className="flex min-w-0 w-full max-w-full flex-wrap"
          value={type}
          onChange={handleTypeChange}
          options={TYPE_OPTIONS}
        />
        <Segmented
          aria-label="Direction"
          className="flex min-w-0 w-full max-w-full flex-wrap"
          value={direction}
          onChange={setDirection}
          options={DIRECTION_OPTIONS}
        />
        <Field label="Summary">
          <textarea
            className="input min-h-[90px] resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened, what was said, or what to send next..."
            maxLength={2000}
          />
        </Field>
        <Field label="Follow-up (optional)">
          <CustomDateTimePicker
            key={followUpPickerKey}
            value={followUpDate}
            onChange={setFollowUpDate}
          />
        </Field>
        <FormActions className="justify-between">
          <span className="text-muted text-xs">{body.length}/2000</span>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={saving || !body.trim()}
          >
            {saving ? "Logging..." : "Log"}
          </button>
        </FormActions>
      </form>

      {loading ? (
        <div className="text-muted text-sm">Loading communication...</div>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No communication yet"
          description="Log a call, text, email, visit, or internal note above."
        />
      ) : (
        <div className="min-w-0 max-w-full space-y-3">
          {notes.map((note) => (
            <ListRow key={note.id} className="min-w-0 max-w-full">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <StatusBadge>{TYPE_LABELS[note.type] || note.type || "Note"}</StatusBadge>
                  <StatusBadge>
                    {DIRECTION_LABELS[note.direction] || note.direction || "Internal"}
                  </StatusBadge>
                  <div className="min-w-0 break-words text-sm font-medium">
                    {note.author_name || "User"}
                  </div>
                </div>
                <div className="text-muted shrink-0 text-xs">
                  {formatRelativeTime(note.created_at)}
                </div>
              </div>
              <div className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                <NoteBody text={note.body} />
              </div>
              {note.follow_up_task ? (
                <div className="mt-2 min-w-0 text-sm">
                  <Link
                    href={`/tasks/${note.follow_up_task.id}`}
                    className="block min-w-0 break-words [overflow-wrap:anywhere] underline underline-offset-4"
                  >
                    Follow-up: {note.follow_up_task.title}
                  </Link>
                </div>
              ) : null}
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
      {confirmModal}
    </div>
  );
}
