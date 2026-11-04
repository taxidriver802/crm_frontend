"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions } from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/helper";
import { JOB_PATH, JOB_PHASES, phaseOf } from "@/lib/job-lifecycle";

const VISIBLE_PHASES = JOB_PHASES.filter((phase) => phase.id !== "lost");

/**
 * Where the job is between first contact and paid-and-closed, and what has to
 * happen next. The backend decides the next step and enforces the close gate;
 * this card shows them and moves the job.
 */
export function JobLifecycleCard({
  job,
  busyStatus,
  error,
  blockers = [],
  onMove,
  nextStepAction,
  canReopen = false,
}) {
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const status = job.status || "New";
  const currentIndex = JOB_PATH.indexOf(status);
  const currentPhase = phaseOf(status);
  const isLost = status === "Lost";
  const isClosed = status === "Closed";
  const step = job.next_step;

  const milestones = [
    job.sold_at ? `Sold ${formatDate(job.sold_at)}` : null,
    job.work_completed_at ? `Work complete ${formatDate(job.work_completed_at)}` : null,
    job.closed_at ? `Closed ${formatDate(job.closed_at)}` : null,
  ].filter(Boolean);

  function chipState(candidate) {
    const index = JOB_PATH.indexOf(candidate);
    if (candidate === status) return "active";
    if (!isLost && index < currentIndex) return "done";
    return "open";
  }

  function chipDisabled(candidate) {
    if (busyStatus) return true;
    if (candidate === status) return true;
    if (isClosed && !canReopen) return true;
    return false;
  }

  return (
    <SectionCard
      size="lg"
      title="Lifecycle"
      description="From first contact to paid and closed"
      right={
        isLost ? (
          <button
            type="button"
            className="btn btn-sm"
            disabled={!!busyStatus}
            onClick={() => onMove("Contacted")}
          >
            Reopen
          </button>
        ) : isClosed ? null : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setLostOpen((open) => !open)}
          >
            {lostOpen ? "Cancel" : "Mark lost"}
          </button>
        )
      }
    >
      <div className="space-y-4">
        {step && step.action !== "none" ? (
          <div
            className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-theme-md border border-base bg-accent-soft p-3"
            data-testid="job-next-step"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted">
                Next step
              </div>
              <div className="mt-0.5 font-medium">{step.label}</div>
              {step.detail ? (
                <div className="mt-0.5 text-sm text-muted">{step.detail}</div>
              ) : null}
            </div>
            {nextStepAction ? <div className="shrink-0">{nextStepAction}</div> : null}
          </div>
        ) : null}

        {isLost ? (
          <Alert tone="neutral">
            Lost{job.lost_at ? ` on ${formatDate(job.lost_at)}` : ""}
            {job.lost_reason ? ` — ${job.lost_reason}` : ""}. Reopen to bring it back into
            selling.
          </Alert>
        ) : null}

        <div className="space-y-3">
          {VISIBLE_PHASES.map((phase) => {
            const phaseIndex = VISIBLE_PHASES.findIndex((p) => p.id === currentPhase);
            const thisIndex = VISIBLE_PHASES.findIndex((p) => p.id === phase.id);
            const phaseDone = !isLost && thisIndex < phaseIndex;
            const phaseActive = phase.id === currentPhase;
            return (
              <div
                key={phase.id}
                className="grid min-w-0 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center"
              >
                <div
                  className={cx(
                    "text-xs font-medium uppercase tracking-wide",
                    phaseActive ? "text-main" : phaseDone ? "text-success" : "text-muted",
                  )}
                >
                  {phase.label}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {phase.statuses.map((candidate) => {
                    const state = chipState(candidate);
                    return (
                      <button
                        key={candidate}
                        type="button"
                        aria-pressed={state === "active"}
                        disabled={chipDisabled(candidate)}
                        onClick={() => onMove(candidate)}
                        className={cx(
                          "choice-chip",
                          state === "active" && "choice-chip-active",
                          state === "done" && "choice-chip-done",
                          busyStatus === candidate && "opacity-60",
                        )}
                      >
                        {candidate}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {milestones.length > 0 ? (
          <div className="text-xs text-muted">{milestones.join(" · ")}</div>
        ) : null}

        {error ? (
          <Alert>
            <div className="font-medium">{error}</div>
            {blockers.length > 0 ? (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}

        {lostOpen && !isLost ? (
          <form
            className="list-row list-row-muted space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onMove("Lost", { lost_reason: lostReason.trim() || null });
              setLostOpen(false);
              setLostReason("");
            }}
          >
            <Field label="Why was it lost?">
              <input
                className="input"
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                placeholder="Went with another bid, price, timing…"
                maxLength={500}
              />
            </Field>
            <FormActions>
              <button type="submit" className="btn btn-danger btn-sm" disabled={!!busyStatus}>
                Mark lost
              </button>
            </FormActions>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
}
