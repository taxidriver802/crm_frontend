"use client";

import { useSyncExternalStore } from "react";

/**
 * True while a CSS media query matches. Lets a component render one layout
 * instead of two hidden-by-CSS copies (duplicate DOM confuses screen readers
 * and doubles the work of a long list). Server renders assume false.
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Tailwind's md breakpoint: lists switch to cards. */
export const PHONE_QUERY = "(max-width: 767.98px)";
