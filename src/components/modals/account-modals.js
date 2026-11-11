"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ModalFrame } from "@/components/ui/overlay";
import { api } from "@/lib/api";

/**
 * Hands a link to an owner or admin: either it was emailed (say so), or
 * this Joist couldn't email it and it is shown once, to copy and send.
 *
 * `handoff`: { title, message, url?, tone? } or null.
 */
export function LinkHandoffModal({ handoff, onClose }) {
  // The link last copied; a new handoff shows "Copy link" again.
  const [copiedUrl, setCopiedUrl] = useState("");
  const copied = Boolean(handoff?.url) && copiedUrl === handoff.url;

  async function copy() {
    if (!handoff?.url) return;
    try {
      await navigator.clipboard.writeText(handoff.url);
      setCopiedUrl(handoff.url);
    } catch {
      setCopiedUrl("");
    }
  }

  return (
    <ModalFrame
      open={Boolean(handoff)}
      onClose={onClose}
      label={handoff?.title || "Link"}
    >
      <div className="space-y-4 p-4" data-testid="link-handoff">
        <h2 className="section-heading">{handoff?.title}</h2>
        <Alert tone={handoff?.tone || (handoff?.url ? "info" : "success")}>
          {handoff?.message}
        </Alert>
        {handoff?.url ? (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Link</span>
              <input
                className="input font-mono text-xs"
                readOnly
                value={handoff.url}
                onFocus={(e) => e.target.select()}
                data-testid="handoff-url"
              />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : null}
        <div className="flex justify-end">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

const ROLE = { owner: "Owner", admin: "Admin", agent: "Agent" };

/** One account event, in words. */
export function describeAccountEvent(event) {
  const by = event.actor_name ? ` by ${event.actor_name}` : "";
  const d = event.detail || {};
  switch (event.event) {
    case "signed_in":
      return "Signed in";
    case "sign_in_failed":
      return "Wrong password at sign-in";
    case "signed_out":
      return "Signed out";
    case "signed_out_elsewhere":
      return `Signed out everywhere else (${d.sessions ?? 0} ${d.sessions === 1 ? "session" : "sessions"})`;
    case "password_changed":
      return "Changed their password";
    case "reset_requested":
      return d.emailed === false
        ? "Asked for a reset link; this Joist can’t email one, so send them a link"
        : "Asked for a reset link by email";
    case "reset_link_issued":
      if (d.by === "operator") return "Reset link made by the operator";
      return `Reset link ${d.emailed ? "emailed" : "made to copy"}${by}`;
    case "password_reset":
      return "Set a new password from a reset link";
    case "role_changed":
      return `Role changed from ${ROLE[d.from] || d.from} to ${ROLE[d.to] || d.to}${by}`;
    case "status_changed":
      return d.to === "disabled"
        ? `Account disabled${by}`
        : `Account turned back on${by}`;
    case "invite_sent":
      return `Invited${by}${d.emailed ? " (emailed)" : ""}`;
    case "invite_resent":
      return `Invite sent again${by}${d.emailed ? " (emailed)" : ""}`;
    case "invite_revoked":
      return `Invite revoked${by}`;
    case "invite_accepted":
      return "Accepted the invite";
    default:
      return event.event;
  }
}

/** A person's newest account events. `person`: { id, name } or null. */
export function AccountHistoryModal({ person, onClose }) {
  // What was loaded, and for whom; it is loading while that isn't this person.
  const [loaded, setLoaded] = useState({ forId: null, events: [], error: "" });
  const state =
    person && loaded.forId === person.id
      ? { loading: false, events: loaded.events, error: loaded.error }
      : { loading: Boolean(person), events: [], error: "" };

  useEffect(() => {
    if (!person) return undefined;
    let cancelled = false;
    api(`/users/${person.id}/events`)
      .then((data) => {
        if (!cancelled)
          setLoaded({ forId: person.id, events: data.events || [], error: "" });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({
            forId: person.id,
            events: [],
            error: err?.message || "Couldn’t load the history.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [person]);

  return (
    <ModalFrame open={Boolean(person)} onClose={onClose} label="Account history">
      <div className="space-y-3 p-4" data-testid="account-history">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-heading">Account history</h2>
            <p className="text-sm text-muted">
              {person?.name}: the 20 newest changes and sign-ins.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {state.loading ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ) : state.error ? (
          <Alert variant="inline">{state.error}</Alert>
        ) : state.events.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <ol className="divide-y divide-base text-sm">
            {state.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2"
              >
                <span>{describeAccountEvent(event)}</span>
                <time className="text-xs text-muted" dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ModalFrame>
  );
}
