"use client";

import { useEffect, useState } from "react";
import {
  buildFileUrl,
  formatBytes,
  formatDate,
  getFileTypeLabel,
  getPreviewKind,
} from "@/lib/helper";

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="text-muted flex items-center gap-3 text-sm">
        <span>Loading preview...</span>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    </div>
  );
}

function EmptyPreviewState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed">
      <div className="text-muted px-6 text-center text-sm">
        Preview not available for this file type.
      </div>
    </div>
  );
}

export function FilePreviewModal({ open, file, onClose }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !file) return;
    setLoading(true);
  }, [open, file]);

  if (!open || !file) return null;

  const previewKind = getPreviewKind(file);
  const fileUrl = buildFileUrl(file);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={file.original_name || "File preview"}
      >
        <div className="border-base flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{file.original_name}</div>
            <div className="text-muted mt-1 text-xs sm:text-sm">
              {getFileTypeLabel(file)} • {formatBytes(file.size_bytes)} • Uploaded{" "}
              {formatDate(file.created_at)}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn px-3 py-2 text-sm"
            >
              Open in New Tab
            </a>

            <button type="button" onClick={onClose} className="btn px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>

        <div className="bg-app flex-1 overflow-auto p-4 sm:p-5">
          <div className="bg-surface border-base min-h-[300px] rounded-xl border p-3 sm:p-4">
            {previewKind === "image" ? (
              <>
                {loading ? <LoadingState /> : null}

                <img
                  src={fileUrl}
                  alt={file.original_name || "Preview"}
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                  className={`mx-auto max-h-[72vh] max-w-full rounded-lg border object-contain ${
                    loading ? "hidden" : "block"
                  }`}
                />
              </>
            ) : previewKind === "pdf" ? (
              <>
                {loading ? <LoadingState /> : null}

                <iframe
                  src={fileUrl}
                  title={file.original_name || "PDF Preview"}
                  onLoad={() => setLoading(false)}
                  className={`h-[72vh] w-full rounded-lg border ${
                    loading ? "hidden" : "block"
                  }`}
                />
              </>
            ) : previewKind === "text" ? (
              <>
                {loading ? <LoadingState /> : null}

                <iframe
                  src={fileUrl}
                  title={file.original_name || "Text Preview"}
                  onLoad={() => setLoading(false)}
                  className={`bg-surface h-[72vh] w-full rounded-lg border ${
                    loading ? "hidden" : "block"
                  }`}
                />
              </>
            ) : (
              <EmptyPreviewState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
