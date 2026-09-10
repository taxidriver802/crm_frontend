"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import { cx } from "@/lib/cx";

/**
 * Associates the label with the first control child via htmlFor/id so
 * getByLabel (and screen readers) work even when callers omit ids.
 */
export function Field({
  label,
  htmlFor,
  required = false,
  help,
  error,
  className = "",
  children,
}) {
  const autoId = useId();
  const childList = Children.toArray(children);
  const firstControlIndex = childList.findIndex((child) => isValidElement(child));
  const firstControl =
    firstControlIndex >= 0 ? childList[firstControlIndex] : null;
  const existingId =
    isValidElement(firstControl) && firstControl.props.id
      ? firstControl.props.id
      : undefined;
  const fieldId = htmlFor || existingId || autoId;

  const wiredChildren = childList.map((child, index) => {
    if (!isValidElement(child) || index !== firstControlIndex) return child;
    if (child.props.id) return child;
    return cloneElement(child, { id: fieldId });
  });

  return (
    <div className={cx("field", className)}>
      {label ? (
        <label htmlFor={fieldId} className="field-label">
          {label}
          {required ? (
            <span className="field-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {wiredChildren}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="field-help">{help}</p>
      ) : null}
    </div>
  );
}

export function FormActions({ className = "", children }) {
  return <div className={cx("form-actions", className)}>{children}</div>;
}
