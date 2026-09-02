import { cx } from "@/lib/cx";

export function Field({
  label,
  htmlFor,
  required = false,
  help,
  error,
  className = "",
  children,
}) {
  return (
    <div className={cx("field", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required ? (
            <span className="field-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
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
