"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls a ref into view when `value` changes (skips the initial mount).
 * Defaults to viewports below `lg` so desktop workstation chrome isn't yanked.
 */
export function useScrollIntoViewOnChange(
  value,
  {
    behavior = "smooth",
    block = "start",
    /** Match Tailwind `lg` — sticky header toggles matter most below this. */
    maxWidthPx = 1023,
  } = {},
) {
  const ref = useRef(null);
  const skipInitial = useRef(true);

  useEffect(() => {
    if (skipInitial.current) {
      skipInitial.current = false;
      return;
    }

    if (typeof window === "undefined") return;
    if (window.matchMedia(`(min-width: ${maxWidthPx + 1}px)`).matches) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    ref.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : behavior,
      block,
    });
  }, [value, behavior, block, maxWidthPx]);

  return ref;
}
