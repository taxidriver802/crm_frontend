export const EMAIL_ERROR = "Enter a valid email";
export const PHONE_ERROR = "Enter a 10-digit phone number";
export const NUMBER_ERROR = "Enter a number";
export const BUDGET_RANGE_ERROR = "Minimum cannot exceed maximum.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOnly(value, max) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return typeof max === "number" ? digits.slice(0, max) : digits;
}

export function emailError(value, { required = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return required ? EMAIL_ERROR : "";
  return EMAIL_RE.test(trimmed) ? "" : EMAIL_ERROR;
}

export function isValidEmail(value) {
  return emailError(value) === "";
}

export function isValidPhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  return digitsOnly(raw).length === 10;
}

export function isValidNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  if (!/^\d+(\.\d+)?$/.test(raw)) return false;
  return Number.isFinite(Number(raw));
}

export function formatPartialPhone(digits) {
  const d = digitsOnly(digits, 10);
  if (!d) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Display mask only. Does not change the stored value. */
export function formatPhoneDisplay(value) {
  const raw = String(value ?? "");
  if (!raw.trim()) return "";
  const digits = digitsOnly(raw);
  const leftover = raw.replace(/[\d\s().-]/g, "");
  if (leftover || digits.length > 10) return raw;
  return formatPartialPhone(digits);
}

export function sanitizeDecimal(value, maxDecimals = Infinity) {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const dot = cleaned.indexOf(".");
  let intPart = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const hasDot = dot !== -1;
  let decPart = hasDot ? cleaned.slice(dot + 1).replace(/\./g, "") : null;
  if (decPart != null && Number.isFinite(maxDecimals)) {
    decPart = decPart.slice(0, maxDecimals);
  }

  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (!intPart && hasDot) intPart = "0";
  if (!hasDot) return intPart;
  if (!decPart) return `${intPart}.`;
  return `${intPart}.${decPart}`;
}

function groupedInteger(intPart) {
  const digits = String(intPart ?? "").replace(/\D/g, "");
  if (!digits) return "0";
  return Number(digits).toLocaleString("en-US");
}

export function formatWholeDollarDisplay(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (!/^\d+(\.\d+)?$/.test(raw)) return String(value);
  const intPart = raw.split(".")[0].replace(/^0+(?=\d)/, "") || "0";
  return `$${groupedInteger(intPart)}`;
}

export function formatCentsDisplay(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const raw = String(value).trim();
  if (!raw) return "";
  if (!/^\d+(\.\d*)?$/.test(raw)) return String(value);

  const [intPart, dec] = raw.split(".");
  const grouped = groupedInteger(intPart || "0");
  if (!raw.includes(".")) return `$${grouped}`;
  return `$${grouped}.${dec ?? ""}`;
}

export function formatNumberDisplay(value, { group = true } = {}) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (!group) return String(value);
    const [intPart, dec] = String(value).split(".");
    const grouped = groupedInteger(intPart);
    return dec != null ? `${grouped}.${dec}` : grouped;
  }

  const raw = String(value).trim();
  if (!raw) return "";
  if (!/^\d+(\.\d*)?$/.test(raw)) return String(value);

  const [intPart, dec] = raw.split(".");
  const grouped = group ? groupedInteger(intPart || "0") : intPart || (raw.includes(".") ? "0" : "");
  if (!raw.includes(".")) return grouped;
  return `${grouped}.${dec ?? ""}`;
}

/** Round a cents draft to a number. A trailing dot stays a string until blur. */
export function commitCents(raw) {
  if (raw == null || raw === "") return "";
  const text = String(raw);
  if (text.endsWith(".")) return text;
  const n = Number(text);
  if (!Number.isFinite(n)) return "";
  return Math.round(Math.max(0, n) * 100) / 100;
}

export function editableRaw(value, { cents = false } = {}) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (!cents) return String(Math.trunc(Math.abs(value)));
    return value.toFixed(2);
  }
  const raw = String(value).trim();
  if (!cents) {
    if (!/^\d+(\.\d+)?$/.test(raw)) return digitsOnly(raw);
    return raw.split(".")[0].replace(/^0+(?=\d)/, "") || "0";
  }
  return raw;
}
