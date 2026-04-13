"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import { SectionSkeleton } from "@/components/loading/loadingSkeletons";
import { PageError } from "@/components/error-boundary";
import { formatDate } from "@/lib/helper";

const TRIGGER_LABELS = {
  ESTIMATE_APPROVED: "Estimate approved",
  LEAD_INACTIVE: "Lead inactive",
  JOB_STATUS_CHANGED: "Job status changed",
  TASK_COMPLETED: "Task completed",
};

const ACTION_LABELS = {
  CREATE_TASKS: "Create tasks",
  CREATE_FOLLOW_UP_TASK: "Create follow-up task",
  SEND_NOTIFICATION: "Send notification",
  UPDATE_STATUS: "Update status",
};

function RuleCard({ rule, onToggle, onDelete, busy }) {
  return (
    <div className="hover:bg-accent flex items-start justify-between gap-3 rounded-lg border p-4 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium">{rule.name}</div>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
              rule.enabled
                ? "border-green-500/30 bg-green-500/10 text-green-700"
                : "border-gray-500/30 bg-gray-500/10 text-gray-700"
            }`}
          >
            {rule.enabled ? "Active" : "Disabled"}
          </span>
        </div>
        {rule.description ? (
          <div className="text-muted mt-1 text-sm">{rule.description}</div>
        ) : null}
        <div className="text-muted mt-2 flex flex-wrap gap-3 text-xs">
          <span>Trigger: {TRIGGER_LABELS[rule.trigger_event] || rule.trigger_event}</span>
          <span>Action: {ACTION_LABELS[rule.action_type] || rule.action_type}</span>
          <span>Created {formatDate(rule.created_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="btn px-3 py-2 text-xs"
          onClick={() => onToggle(rule)}
          disabled={busy}
        >
          {rule.enabled ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          className="btn px-3 py-2 text-xs text-red-600"
          onClick={() => onDelete(rule)}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TemplateCard({ template, onActivate, busy }) {
  return (
    <div className="hover:bg-accent flex items-start justify-between gap-3 rounded-lg border p-4 transition">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{template.name}</div>
        {template.description ? (
          <div className="text-muted mt-1 text-sm">{template.description}</div>
        ) : null}
        <div className="text-muted mt-2 flex flex-wrap gap-3 text-xs">
          <span>
            Trigger: {TRIGGER_LABELS[template.trigger_event] || template.trigger_event}
          </span>
          <span>
            Action: {ACTION_LABELS[template.action_type] || template.action_type}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="btn shrink-0 px-3 py-2 text-xs"
        onClick={() => onActivate(template)}
        disabled={busy}
      >
        Activate
      </button>
    </div>
  );
}

export default function AutomationPage() {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [rulesRes, templatesRes] = await Promise.all([
        api("/automation/rules"),
        api("/automation/templates"),
      ]);
      setRules(rulesRes.rules || []);
      setTemplates(templatesRes.templates || []);
    } catch (e) {
      setError(e?.message || "Failed to load automation data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleToggle(rule) {
    setBusy(true);
    try {
      await api(`/automation/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)),
      );
    } catch (e) {
      setError(e?.message || "Failed to toggle rule");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(rule) {
    const confirmed = window.confirm(`Delete "${rule.name}"?`);
    if (!confirmed) return;
    setBusy(true);
    try {
      await api(`/automation/rules/${rule.id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (e) {
      setError(e?.message || "Failed to delete rule");
    } finally {
      setBusy(false);
    }
  }

  async function handleActivateTemplate(template) {
    setBusy(true);
    setError("");
    try {
      const res = await api(`/automation/rules/from-template/${template.template_id}`, {
        method: "POST",
      });
      setRules((prev) => [res.rule, ...prev]);
    } catch (e) {
      setError(e?.message || "Failed to activate template");
    } finally {
      setBusy(false);
    }
  }

  const activeTemplateIds = new Set(
    rules
      .map((r) => {
        const match = templates.find(
          (t) => t.trigger_event === r.trigger_event && t.action_type === r.action_type,
        );
        return match?.template_id;
      })
      .filter(Boolean),
  );

  const availableTemplates = templates.filter(
    (t) => !activeTemplateIds.has(t.template_id),
  );

  return (
    <AppShell
      title="Automation"
      description="Workflow rules that run automatically when events occur."
    >
      <div className="space-y-6">
        {error ? <PageError message={error} onRetry={loadData} /> : null}

        <CollapsibleSection
          title="Active Rules"
          description="Rules currently configured."
          defaultOpen
        >
          {loading ? (
            <SectionSkeleton rows={3} />
          ) : rules.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              No rules configured. Activate a template below to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Rule Templates"
          description="Pre-built workflow rules you can activate with one click."
          defaultOpen
        >
          {loading ? (
            <SectionSkeleton rows={3} />
          ) : availableTemplates.length === 0 ? (
            <div className="text-muted rounded-lg border border-dashed p-4 text-sm">
              All templates have been activated.
            </div>
          ) : (
            <div className="space-y-3">
              {availableTemplates.map((template) => (
                <TemplateCard
                  key={template.template_id}
                  template={template}
                  onActivate={handleActivateTemplate}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </AppShell>
  );
}
