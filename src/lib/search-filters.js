/** Parse command-palette filter tokens from a free-text query. */

const TYPE_ALIASES = {
  lead: "leads",
  leads: "leads",
  job: "jobs",
  jobs: "jobs",
  task: "tasks",
  tasks: "tasks",
  invoice: "invoices",
  invoices: "invoices",
  estimate: "estimates",
  estimates: "estimates",
  file: "files",
  files: "files",
  user: "users",
  users: "users",
};

const TYPE_LABELS = {
  leads: "Lead",
  jobs: "Job",
  tasks: "Task",
  invoices: "Invoice",
  estimates: "Estimate",
  files: "File",
  users: "User",
};

const TOKEN_RE =
  /(?:^|\s)(lead|leads|job|jobs|task|tasks|invoice|invoices|estimate|estimates|file|files|user|users|status|assigned|jump):([^\s]*)/gi;

/**
 * @returns {{
 *   text: string,
 *   types: string[],
 *   status: string | null,
 *   assigned: string | null,
 *   jump: boolean,
 *   tokens: Array<{ key: string, value: string, raw: string, label: string }>,
 * }}
 */
export function parseSearchQuery(query) {
  const raw = String(query || "");
  const types = [];
  const tokens = [];
  let status = null;
  let assigned = null;
  let jump = false;
  const valueBits = [];

  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(raw)) !== null) {
    const key = match[1].toLowerCase();
    const value = (match[2] || "").trim();
    const rawToken = `${match[1]}:${match[2] || ""}`;

    if (key === "jump") {
      if (!jump) {
        jump = true;
        tokens.push({
          key: "jump",
          value: "",
          raw: value ? rawToken : "jump:",
          label: "Jump",
        });
      }
      continue;
    }

    if (key === "status") {
      if (value) {
        status = value;
        tokens.push({
          key: "status",
          value,
          raw: rawToken,
          label: `Status: ${value}`,
        });
      }
      continue;
    }

    if (key === "assigned") {
      if (value) {
        assigned = value.toLowerCase();
        tokens.push({
          key: "assigned",
          value: assigned,
          raw: rawToken,
          label: `Assigned: ${assigned}`,
        });
      }
      continue;
    }

    const type = TYPE_ALIASES[key];
    if (type && !types.includes(type)) {
      types.push(type);
      tokens.push({
        key: "type",
        value: type,
        raw: value ? rawToken : `${key}:`,
        label: TYPE_LABELS[type] || type,
      });
    }
    if (value) valueBits.push(value);
  }

  const text = raw
    .replace(TOKEN_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  const freeText = [text, ...valueBits].filter(Boolean).join(" ").trim();

  return { text: freeText, types, status, assigned, jump, tokens };
}

/** Remove one filter token occurrence from the query string. */
export function removeSearchFilterToken(query, tokenRaw) {
  const raw = String(query || "");
  if (!tokenRaw) return raw;
  const escaped = tokenRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return raw
    .replace(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Insert or replace a filter token in the query.
 * @param {string} query
 * @param {{ key: string, value: string, raw: string }} token
 */
export function applySearchFilterToken(query, token) {
  if (!token?.raw) return String(query || "");
  let next = String(query || "");
  const parsed = parseSearchQuery(next);

  if (token.key === "status" || token.key === "assigned") {
    const existing = parsed.tokens.find((item) => item.key === token.key);
    if (existing) next = removeSearchFilterToken(next, existing.raw);
  }

  if (token.key === "jump") {
    if (parsed.jump) return String(query || "").trim();
    const trimmed = String(query || "").trim();
    return trimmed ? `${trimmed} jump:` : "jump:";
  }

  if (token.key === "type") {
    if (parsed.types.includes(token.value)) return next.trim();
  }

  const trimmed = next.trim();
  return trimmed ? `${trimmed} ${token.raw}` : token.raw;
}

/** Build GET /search query string from parsed filters + free text. */
export function buildSearchRequestQuery({
  text,
  types,
  status,
  assigned,
  contextType,
  contextId,
}) {
  const params = new URLSearchParams();
  if (text) params.set("q", text);
  if (types?.length) params.set("types", types.join(","));
  if (status) params.set("status", status);
  if (assigned) params.set("assigned", assigned);
  if (contextType && contextId) {
    params.set("contextType", contextType);
    params.set("contextId", String(contextId));
  }
  return params.toString();
}

export function hasActiveSearchFilters(parsed) {
  if (!parsed) return false;
  return Boolean(
    parsed.types?.length ||
      parsed.status ||
      parsed.assigned ||
      parsed.jump ||
      parsed.text,
  );
}

/** Starter examples for empty Results state. */
export const SEARCH_FILTER_EXAMPLES = [
  {
    key: "assigned",
    value: "me",
    raw: "assigned:me",
    label: "Assigned to me",
  },
  {
    key: "status",
    value: "New",
    raw: "status:New",
    label: "Status: New",
  },
  {
    key: "type",
    value: "leads",
    raw: "lead:",
    label: "Leads only",
  },
];

export const SEARCH_JUMP_FILTER = {
  key: "jump",
  value: "",
  raw: "jump:",
  label: "Section jumps",
};

/** Compact Filters menu entries. */
export const SEARCH_FILTER_MENU = [
  {
    heading: "Type",
    items: [
      { key: "type", value: "leads", raw: "lead:", label: "Leads" },
      { key: "type", value: "jobs", raw: "job:", label: "Jobs" },
      { key: "type", value: "tasks", raw: "task:", label: "Tasks" },
      { key: "type", value: "invoices", raw: "invoice:", label: "Invoices" },
    ],
  },
  {
    heading: "Status",
    items: [
      { key: "status", value: "New", raw: "status:New", label: "New" },
      { key: "status", value: "Pending", raw: "status:Pending", label: "Pending" },
      { key: "status", value: "Draft", raw: "status:Draft", label: "Draft" },
    ],
  },
  {
    heading: "Assigned",
    items: [
      { key: "assigned", value: "me", raw: "assigned:me", label: "Assigned to me" },
    ],
  },
];
