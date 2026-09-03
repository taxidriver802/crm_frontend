"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ModalFrame } from "@/components/ui/overlay";
import { cx } from "@/lib/cx";

/**
 * Shared confirmation dialog using ModalFrame + theme button tokens.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void | Promise<void>} props.onConfirm
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.confirmLabel="Confirm"]
 * @param {string} [props.cancelLabel="Cancel"]
 * @param {"default" | "danger"} [props.tone="default"]
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={busy ? undefined : onClose}
      labelledBy={titleId}
      panelClassName="card relative w-full max-w-sm overflow-hidden rounded-2xl"
    >
      <div className="space-y-4 p-5">
        <div>
          <h2 id={titleId} className="section-heading">
            {title}
          </h2>
          {description ? (
            <p className="text-muted mt-1.5 text-sm leading-relaxed">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cx("btn", tone === "danger" ? "btn-danger" : "btn-primary")}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

/**
 * Convenience hook for imperative confirm dialogs.
 *
 * @example
 * const { askConfirm, confirmModal } = useConfirmModal();
 * askConfirm({
 *   title: "Delete this file?",
 *   confirmLabel: "Delete",
 *   onConfirm: async () => { ... },
 * });
 * // render {confirmModal} once in the tree
 */
export function useConfirmModal() {
  const [config, setConfig] = useState(null);

  const close = useCallback(() => setConfig(null), []);

  const askConfirm = useCallback((next) => {
    setConfig(next);
  }, []);

  const handleConfirm = useCallback(async () => {
    await config?.onConfirm?.();
    setConfig(null);
  }, [config]);

  const confirmModal = (
    <ConfirmModal
      open={!!config}
      onClose={close}
      onConfirm={handleConfirm}
      title={config?.title ?? ""}
      description={config?.description}
      confirmLabel={config?.confirmLabel}
      cancelLabel={config?.cancelLabel}
      tone={config?.tone ?? "danger"}
    />
  );

  return { askConfirm, confirmModal, closeConfirm: close };
}
