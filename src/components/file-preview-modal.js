"use client";

import { useEffect, useState } from "react";
import {
  buildFileUrl,
  formatBytes,
  formatDate,
  getFileTypeLabel,
  getPreviewKind,
} from "@/lib/helper";

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
        className="bg-surface border-base flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-base flex items-start justify-between gap-4 border-b p-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{file.original_name}</div>
            <div className="text-muted mt-1 text-xs">
              {getFileTypeLabel(file)} • {formatBytes(file.size_bytes)} • Uploaded{" "}
              {formatDate(file.created_at)}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Open in new tab
            </a>

            <button
              type="button"
              onClick={onClose}
              className="border-base bg-surface hover:bg-accent-soft rounded-md border px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="bg-app min-h-[300px] flex-1 overflow-auto p-4">
          {previewKind === "image" ? (
            <>
              {loading ? (
                <div className="flex h-[70vh] items-center justify-center">
                  <div className="text-muted flex items-center gap-3 text-sm">
                    <span>Loading preview...</span>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                </div>
              ) : null}

              <img
                src={fileUrl}
                alt={file.original_name || "Preview"}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                className={`mx-auto max-h-[70vh] max-w-full rounded-md border object-contain ${
                  loading ? "hidden" : "block"
                }`}
              />
            </>
          ) : previewKind === "pdf" ? (
            <>
              {loading ? (
                <div className="flex h-[70vh] items-center justify-center">
                  <div className="text-muted flex items-center gap-3 text-sm">
                    <span>Loading preview...</span>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                </div>
              ) : null}

              <iframe
                src={`${fileUrl}`}
                title={file.original_name || "PDF Preview"}
                onLoad={() => setLoading(false)}
                className={`h-[70vh] w-full rounded-md border ${loading ? "hidden" : "block"}`}
              />
            </>
          ) : previewKind === "text" ? (
            <>
              {loading ? (
                <div className="flex h-[70vh] items-center justify-center">
                  <div className="text-muted flex items-center gap-3 text-sm">
                    <span>Loading preview...</span>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                </div>
              ) : null}

              <iframe
                src={fileUrl}
                title={file.original_name || "Text Preview"}
                onLoad={() => setLoading(false)}
                className={`bg-surface h-[70vh] w-full rounded-md border ${
                  loading ? "hidden" : "block"
                }`}
              />
            </>
          ) : (
            <div className="text-muted flex h-[40vh] items-center justify-center text-sm">
              Preview not available for this file type.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
