export const WORKSPACE_DEFAULTS = {
  density: "comfortable",
  desk: "queue",
  job_pane: "work",
};

export const JOB_PANES = [
  { id: "work", label: "Work" },
  { id: "money", label: "Money" },
  { id: "site", label: "Site" },
  { id: "record", label: "Record" },
];

export function normalizePreferences(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    density: value.density === "compact" ? "compact" : "comfortable",
    desk: value.desk === "money" ? "money" : "queue",
    job_pane: JOB_PANES.some((pane) => pane.id === value.job_pane)
      ? value.job_pane
      : "work",
  };
}
