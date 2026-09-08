"use client";

import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import { EmptyState } from "@/components/error-boundary";

function assigneeQuery(userId) {
  if (userId == null) return "unassigned";
  return String(userId);
}

export function WorkloadTable({ rows = [], loading = false }) {
  const list = Array.isArray(rows) ? rows : [];

  return (
    <SectionCard
      title="Team workload"
      right={
        <span className="text-muted text-xs">Open work by assignee</span>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : list.length === 0 ? (
        <EmptyState title="No team members yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-muted border-base border-b text-xs">
                <th className="py-2 pr-3 font-medium">Assignee</th>
                <th className="py-2 pr-3 font-medium">Leads</th>
                <th className="py-2 pr-3 font-medium">Jobs</th>
                <th className="py-2 pr-3 font-medium">Tasks</th>
                <th className="py-2 font-medium">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const key = row.user_id || "unassigned";
                const assigned = assigneeQuery(row.user_id);
                return (
                  <tr key={key} className="border-base border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/leads?assignedTo=${encodeURIComponent(assigned)}`}
                        className="hover:underline"
                      >
                        {row.leads_open}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/jobs?assignedTo=${encodeURIComponent(assigned)}`}
                        className="hover:underline"
                      >
                        {row.jobs_open}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/tasks?assignedTo=${encodeURIComponent(assigned)}`}
                        className="hover:underline"
                      >
                        {row.tasks_open}
                      </Link>
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/tasks?assignedTo=${encodeURIComponent(assigned)}&duePreset=overdue`}
                        className={
                          row.tasks_overdue > 0
                            ? "text-danger font-medium hover:underline"
                            : "hover:underline"
                        }
                      >
                        {row.tasks_overdue}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
