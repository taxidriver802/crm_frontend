"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFileUrl } from "@/lib/helper";
import { Alert } from "@/components/ui/alert";
import { Overlay } from "@/components/ui/overlay";
import { EmptyState } from "@/components/error-boundary";

const PHOTO_GROUPS = [
  { key: "before", label: "Before" },
  { key: "after", label: "After" },
  { key: "other", label: "Other" },
];

function isImageFile(file) {
  const mime = String(file?.mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;

  const name = String(file?.original_name || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => name.endsWith(ext));
}

function photoCaption(file) {
  const caption = String(file?.caption || "").trim();
  if (caption) return caption;
  return file?.original_name || "Photo";
}

function photoDate(file) {
  if (!file?.created_at) return "";
  const date = new Date(file.created_at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function PhotoGallery({
  files = [],
  loading = false,
  error = "",
  emptyTitle = "No photos on this job yet",
  emptyDescription = "Upload images in Attached Files.",
}) {
  const photos = useMemo(() => files.filter(isImageFile), [files]);
  const groups = useMemo(
    () =>
      PHOTO_GROUPS.map((group) => ({
        ...group,
        photos: photos.filter((file) => (file.category || "other") === group.key),
      })).filter((group) => group.photos.length > 0),
    [photos],
  );
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

  const activePhoto = activeIndex >= 0 ? photos[activeIndex] : null;

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
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="text-muted text-xs font-medium uppercase tracking-wide">
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.photos.map((file) => {
                  const index = photos.findIndex((row) => row.id === file.id);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      className="group relative overflow-hidden rounded-md border"
                      onClick={() => setActiveIndex(index)}
                      title={photoCaption(file)}
                    >
                      <img
                        src={buildFileUrl(file)}
                        alt={photoCaption(file)}
                        className="h-32 w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activePhoto ? (
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
              src={buildFileUrl(activePhoto)}
              alt={photoCaption(activePhoto)}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            <div className="text-on-overlay mt-2 text-center text-xs opacity-90">
              {photoCaption(activePhoto)}
              {photoDate(activePhoto) ? ` · ${photoDate(activePhoto)}` : ""}
            </div>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}
