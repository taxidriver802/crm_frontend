"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFileUrl } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { Overlay } from "@/components/ui/overlay";
import { EmptyState } from "@/components/error-boundary";

function isImageFile(file) {
  const mime = String(file?.mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;

  const name = String(file?.original_name || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => name.endsWith(ext));
}

export function PhotoGallery({ files = [], loading = false, error = "" }) {
  const photos = useMemo(() => files.filter(isImageFile), [files]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function onKeyDown(event) {
      if (activeIndex < 0) return;
      if (event.key === "Escape") setActiveIndex(-1);
      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % photos.length);
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, photos.length]);

  return (
    <div className="space-y-3">
      {error ? <Alert variant="inline">{error}</Alert> : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-accent h-28 animate-pulse rounded-md" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          title="No photos on this job yet"
          description="Upload images in Attached Files."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((file, index) => (
            <button
              key={file.id}
              type="button"
              className="group relative overflow-hidden rounded-md border"
              onClick={() => setActiveIndex(index)}
              title={file.original_name}
            >
              <img
                src={buildFileUrl(file)}
                alt={file.original_name || `Photo ${index + 1}`}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {activeIndex >= 0 && photos[activeIndex] ? (
        <Overlay
          layer="lightbox"
          strong
          className="flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="bg-overlay text-on-overlay absolute right-4 top-4 rounded px-3 py-2 text-sm"
            onClick={() => setActiveIndex(-1)}
          >
            Close
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="bg-overlay text-on-overlay absolute left-4 rounded px-3 py-2 text-sm"
                onClick={() =>
                  setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)
                }
              >
                Prev
              </button>
              <button
                type="button"
                className="bg-overlay text-on-overlay absolute right-4 rounded px-3 py-2 text-sm"
                onClick={() => setActiveIndex((prev) => (prev + 1) % photos.length)}
              >
                Next
              </button>
            </>
          ) : null}

          <div className="max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg">
            <img
              src={buildFileUrl(photos[activeIndex])}
              alt={photos[activeIndex].original_name || "Photo"}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            <div className="text-on-overlay mt-2 text-center text-xs opacity-90">
              {photos[activeIndex].original_name}
            </div>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}
