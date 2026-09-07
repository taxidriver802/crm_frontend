const FROM_PARAM = "from";
const FROM_LABEL_PARAM = "fromLabel";
const LOCAL_ORIGIN = "http://local.invalid";

const ALLOWED_PREFIXES = [
  "/dashboard",
  "/leads",
  "/jobs",
  "/tasks",
  "/invoices",
  "/estimates",
  "/files",
  "/reports",
  "/automation",
  "/integrations",
  "/users",
];

const INFER_LABEL_RULES = [
  [/^\/jobs\/[^/]+/, "job"],
  [/^\/leads\/[^/]+/, "lead"],
  [/^\/tasks\/[^/]+/, "task"],
  [/^\/invoices\/[^/]+/, "invoice"],
  [/^\/estimates\/[^/]+/, "estimate"],
  [/^\/jobs/, "Jobs"],
  [/^\/leads/, "Leads"],
  [/^\/tasks/, "Tasks"],
  [/^\/invoices/, "Invoices"],
  [/^\/estimates/, "Estimates"],
  [/^\/files/, "Files"],
  [/^\/reports/, "Reports"],
  [/^\/automation/, "Automation"],
  [/^\/integrations/, "Integrations"],
  [/^\/users/, "Users"],
  [/^\/dashboard/, "Dashboard"],
];

function pathnameOf(value) {
  try {
    return new URL(String(value), LOCAL_ORIGIN).pathname;
  } catch {
    return String(value).split("?")[0].split("#")[0];
  }
}

export function inferReturnLabel(hrefOrPath) {
  const pathname = pathnameOf(hrefOrPath);
  const match = INFER_LABEL_RULES.find(([pattern]) => pattern.test(pathname));
  return match ? match[1] : "previous page";
}

export function originLabelFromTitle(title, pathname) {
  if (typeof title === "string" && title.trim()) return title.trim();
  if (typeof title === "number") return String(title);
  return inferReturnLabel(pathname);
}

export function isSafeReturnPath(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 512) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return false;
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return false;
  }

  if (decoded.includes("://") || decoded.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(decoded)) return false;

  const pathname = pathnameOf(decoded);
  if (!pathname.startsWith("/")) return false;

  return ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function formatBackLabel(label) {
  const text = typeof label === "string" ? label.trim() : "";
  if (!text) return "Back";
  if (/^back\b/i.test(text)) return text;
  return `Back to ${text}`;
}

export function currentOriginHref(pathname, searchParams) {
  if (!pathname) return "";
  const params = new URLSearchParams(searchParams?.toString?.() || "");
  params.delete(FROM_PARAM);
  params.delete(FROM_LABEL_PARAM);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function isCreateOrEditPath(href) {
  if (typeof href !== "string" || href.length === 0) return false;
  const pathname = pathnameOf(href);
  if (pathname.endsWith("/new") || pathname.endsWith("/edit")) return true;
  try {
    const url = new URL(href, LOCAL_ORIGIN);
    return url.searchParams.get("open") === "create";
  } catch {
    return false;
  }
}

export function withReturnTo(href, { from, fromLabel } = {}) {
  if (typeof href !== "string" || href.length === 0) return href;
  if (isCreateOrEditPath(href)) return href;
  if (!from || !isSafeReturnPath(from)) return href;

  let url;
  try {
    url = new URL(href, LOCAL_ORIGIN);
  } catch {
    return href;
  }

  if (url.origin !== LOCAL_ORIGIN) return href;
  if (pathnameOf(from) === url.pathname) return href;

  url.searchParams.set(FROM_PARAM, from);
  const label = typeof fromLabel === "string" ? fromLabel.trim() : "";
  if (label) url.searchParams.set(FROM_LABEL_PARAM, label);
  else url.searchParams.delete(FROM_LABEL_PARAM);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseReturnTo(searchParams, pathname) {
  if (!searchParams) return null;

  const from = searchParams.get(FROM_PARAM);
  if (!isSafeReturnPath(from)) return null;
  if (pathname && pathnameOf(from) === pathname) return null;

  const fromLabel =
    (searchParams.get(FROM_LABEL_PARAM) || "").trim() || inferReturnLabel(from);

  return { href: from, label: fromLabel };
}

export function resolveReturnBack(back, parsed) {
  if (back === false) return null;

  const override = back && typeof back === "object" ? back : null;
  const href = override?.href || parsed?.href;
  if (!href || !isSafeReturnPath(href)) return null;

  const text = formatBackLabel(
    override?.label || parsed?.label || inferReturnLabel(href),
  );

  return { href, text };
}
