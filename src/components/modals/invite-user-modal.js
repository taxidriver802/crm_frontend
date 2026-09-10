"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ModalFrame } from "@/components/ui/overlay";
import { Field, FormActions } from "@/components/ui/field";

const ROLE_OPTIONS = [
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Admin" },
];

export function InviteUserModal({ open, onClose }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "agent",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successUser, setSuccessUser] = useState(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [hasCopied, setHasCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        role: "agent",
      });
      setSubmitting(false);
      setError("");
      setSuccessUser(null);
      setInviteUrl("");
      setEmailSent(false);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessUser(null);
    setInviteUrl("");

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Base-Url": window.location.origin,
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to create invite");
        return;
      }

      setSuccessUser(data.user);
      setInviteUrl(data.invite_url || "");
      setEmailSent(!!data.email_sent);

      if (!data.email_sent && data.email_error) {
        setError(data.email_error);
      }
    } catch {
      setError("Something went wrong while creating the invite");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setError("Could not copy invite link");
    }
  }

  if (!open) return null;

  return (
    <ModalFrame open={open} onClose={onClose} label="Invite user">
        <div className="border-base flex items-start justify-between gap-4 border-b p-4">
          <div>
            <h2 className="section-heading">Invite user</h2>
            <p className="text-muted mt-1 text-sm">
              Create an invited account and generate a one-time invite link.
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost text-sm">
            Close
          </button>
        </div>

        <div className="p-4">
          {!successUser ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <input
                    value={form.first_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    className="input"
                    required
                  />
                </Field>

                <Field label="Last name" required>
                  <input
                    value={form.last_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                    className="input"
                    required
                  />
                </Field>
              </div>

              <Field label="Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="input"
                  required
                />
              </Field>

              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="input"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              {error ? <Alert variant="inline">{error}</Alert> : null}

              <FormActions className="justify-end pt-2">
                <button type="button" onClick={onClose} className="btn">
                  Cancel
                </button>

                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? "Creating…" : "Create invite"}
                </button>
              </FormActions>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="card p-3">
                <div className="font-medium">
                  Invite created for {successUser.first_name} {successUser.last_name}
                </div>
                <div className="text-muted mt-1 text-sm">
                  {successUser.email} · {successUser.role} · {successUser.status}
                </div>
              </div>

              <div className="card p-3">
                {emailSent ? (
                  <>
                    <div className="font-medium">Invite email sent</div>
                    <p className="text-muted mt-1 text-sm">
                      Sent to <strong>{successUser.email}</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-sm font-medium">
                      Email failed — manual link
                    </div>

                    <div className="bg-surface border-base overflow-x-auto break-all rounded-md border px-3 py-2 text-sm">
                      {inviteUrl}
                    </div>

                    <p className="text-muted mt-2 text-xs">Copy and send manually.</p>
                  </>
                )}
              </div>

              {error ? <Alert variant="inline">{error}</Alert> : null}

              <div className="flex items-center justify-end gap-2">
                {!emailSent && (
                  <button onClick={handleCopy} className="btn">
                    {hasCopied ? "Copied" : "Copy link"}
                  </button>
                )}

                <button onClick={onClose} className="btn btn-primary">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
    </ModalFrame>
  );
}
