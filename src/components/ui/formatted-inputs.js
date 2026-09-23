"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  commitCents,
  digitsOnly,
  editableRaw,
  formatCentsDisplay,
  formatNumberDisplay,
  formatPhoneDisplay,
  formatWholeDollarDisplay,
  sanitizeDecimal,
} from "@/lib/input-format";

function significantBefore(value, index) {
  return String(value ?? "")
    .slice(0, index)
    .replace(/[^\d.]/g, "").length;
}

function indexAfterSignificant(value, count) {
  if (count <= 0) return 0;
  let seen = 0;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    if (/[\d.]/.test(text[i])) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return text.length;
}

function useFormattedCaret(display, revision = 0) {
  const ref = useRef(null);
  const mark = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement !== el || mark.current == null) return;
    const pos = indexAfterSignificant(el.value, mark.current);
    el.setSelectionRange(pos, pos);
  }, [display, revision]);

  function rememberCaret(event) {
    const el = event.target;
    mark.current = significantBefore(el.value, el.selectionStart ?? el.value.length);
  }

  return { ref, rememberCaret };
}

export function EmailInput({
  value,
  onChange,
  invalid = false,
  className = "input",
  ...rest
}) {
  return (
    <input
      {...rest}
      type="email"
      inputMode="email"
      autoComplete={rest.autoComplete ?? "email"}
      className={className}
      value={value ?? ""}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function PhoneInput({
  value,
  onChange,
  invalid = false,
  className = "input",
  ...rest
}) {
  const display = formatPhoneDisplay(value);
  const [epoch, setEpoch] = useState(0);
  const { ref, rememberCaret } = useFormattedCaret(display, epoch);

  function handleChange(event) {
    rememberCaret(event);
    const next = digitsOnly(event.target.value, 10);
    if (next === digitsOnly(value, 10)) {
      if (event.target.value !== display) setEpoch((n) => n + 1);
      return;
    }
    onChange(next);
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? "tel"}
      className={className}
      value={display}
      aria-invalid={invalid || undefined}
      onChange={handleChange}
    />
  );
}

export function CurrencyInput({
  value,
  onChange,
  cents = false,
  invalid = false,
  className = "input",
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(null);
  const dirty = useRef(false);

  const editing = focused && draft != null;
  const display = cents
    ? formatCentsDisplay(editing ? draft : value)
    : formatWholeDollarDisplay(editing ? draft : value);
  const [epoch, setEpoch] = useState(0);
  const { ref, rememberCaret } = useFormattedCaret(display, epoch);

  function handleFocus(event) {
    dirty.current = false;
    setDraft(editableRaw(value, { cents }));
    setFocused(true);
    rest.onFocus?.(event);
  }

  function handleChange(event) {
    rememberCaret(event);
    const next = cents
      ? sanitizeDecimal(event.target.value, 2)
      : digitsOnly(event.target.value).replace(/^0+(?=\d)/, "");
    const baseline = draft ?? editableRaw(value, { cents });
    if (next === baseline) {
      if (event.target.value !== display) setEpoch((n) => n + 1);
      return;
    }
    dirty.current = true;
    setDraft(next);
    const committed = cents ? commitCents(next) : next;
    if (Object.is(committed, value) || String(committed) === String(value ?? "")) return;
    onChange(committed);
  }

  function handleBlur(event) {
    if (dirty.current && cents && typeof draft === "string" && draft.endsWith(".")) {
      const n = Number(draft.slice(0, -1));
      const rounded = Number.isFinite(n) ? Math.round(Math.max(0, n) * 100) / 100 : "";
      if (!Object.is(rounded, value)) onChange(rounded);
    }
    dirty.current = false;
    setDraft(null);
    setFocused(false);
    rest.onBlur?.(event);
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={display}
      aria-invalid={invalid || undefined}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  allowDecimal = false,
  group = false,
  maxDecimals,
  invalid = false,
  className = "input",
  ...rest
}) {
  const display = formatNumberDisplay(value, { group });
  const [epoch, setEpoch] = useState(0);
  const { ref, rememberCaret } = useFormattedCaret(display, epoch);
  const decimalLimit = allowDecimal ? (maxDecimals ?? Infinity) : 0;

  function handleChange(event) {
    rememberCaret(event);
    const next =
      decimalLimit === 0
        ? digitsOnly(event.target.value)
        : sanitizeDecimal(event.target.value, decimalLimit);
    if (next === String(value ?? "")) {
      if (event.target.value !== display) setEpoch((n) => n + 1);
      return;
    }
    onChange(next);
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      className={className}
      value={display}
      aria-invalid={invalid || undefined}
      onChange={handleChange}
    />
  );
}
