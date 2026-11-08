"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";

const ToastContext = createContext({ showToast: () => {}, dismissToast: () => {} });

/**
 * Quiet confirmations at the bottom of the screen, out of the way of the
 * header and the peek panel. A toast may carry one action (usually Undo);
 * those stay a little longer so there is time to use them.
 *
 * showToast(message, { tone?: "neutral" | "success" | "danger", action?: { label, onClick } })
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, options = {}) => {
      seq.current += 1;
      const id = seq.current;
      const toast = {
        id,
        message,
        tone: options.tone || "neutral",
        action: options.action || null,
      };
      setToasts((prev) => [...prev.slice(-3), toast]);
      setTimeout(() => dismissToast(id), toast.action ? 6500 : 3200);
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-stack"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div key={t.id} className={cx("toast", t.tone !== "neutral" && `toast-${t.tone}`)}>
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action.onClick?.();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
