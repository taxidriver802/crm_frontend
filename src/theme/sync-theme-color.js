/** Keep the browser chrome color in sync with the active canvas token. */
export function syncThemeColorMeta() {
  if (typeof document === "undefined") return;

  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!bg) return;

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    if (meta.getAttribute("content") !== bg) meta.setAttribute("content", bg);
  });
}

/**
 * Sync now, and again whenever Next rewrites the head. Next re-applies the
 * layout's viewport themeColor (the default palette) after client
 * navigations, which put a company's palette back to Ember's canvas once
 * sign-in moved on to the dashboard. Returns the disconnect.
 */
export function watchThemeColorMeta() {
  if (typeof document === "undefined") return () => {};
  syncThemeColorMeta();
  const observer = new MutationObserver(syncThemeColorMeta);
  observer.observe(document.head, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["content"],
  });
  return () => observer.disconnect();
}
