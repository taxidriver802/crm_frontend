/** Keep the browser chrome color in sync with the active canvas token. */
export function syncThemeColorMeta() {
  if (typeof document === "undefined") return;

  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!bg) return;

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", bg);
  });
}
