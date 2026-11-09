"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/components/workspace/workspace-provider";

/**
 * Company setup (team, templates, automation, integrations) is for owners
 * and admins; the API refuses everyone else. Someone who follows a link here
 * gets one clear answer instead of a page of controls that fail.
 */
export function AdminOnly({ title, area, children }) {
  const { user, isAdmin } = useWorkspace();

  if (!user) {
    return (
      <AppShell title={title}>
        <div className="skeleton h-40 w-full rounded-xl" aria-busy="true" />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title={title}>
        <section className="record-unavailable" data-testid="admin-only" role="status">
          <h2 className="text-base font-semibold">{area} is managed by owners and admins</h2>
          <p className="text-sm text-muted">
            Ask an owner or admin if something here needs to change.
          </p>
          <div>
            <Link href="/dashboard" className="btn btn-sm">
              Back to Today
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return children;
}
