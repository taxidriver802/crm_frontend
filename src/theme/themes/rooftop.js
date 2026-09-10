/** Rooftop Realty brand. Accent is rgb(249, 115, 22); buttons use dark ink on orange. */
export const rooftop = {
  id: "rooftop",
  label: "Rooftop",
  preview: {
    bg: "#f4f5f7",
    surface: "#eceef2",
    accent: "#f97316",
  },
  light: {
    "--bg": "#f4f5f7",
    "--surface": "#eceef2",
    "--surface-elevated": "#ffffff",

    "--border": "#e2e4ea",
    "--border-strong": "#cfd3dc",
    "--border-extra": "#8b909c",

    "--text": "#111318",
    "--text-muted": "#5c6370",
    "--text-soft": "#8b919c",
    "--on-accent": "#111318",

    "--accent": "#f97316",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#16a34a",
    "--warning": "#ca8a04",
    "--danger": "#dc2626",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(17 19 24 / 0.45)",
    "--overlay-strong": "rgb(17 19 24 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#363a43",
    "--chrome-elevated": "#40454f",
    "--chrome-border": "#4e463c",
    "--chrome-text": "#f4f4f5",
    "--chrome-muted": "#a8adb8",
    "--chrome-hover": "color-mix(in srgb, #ffffff 10%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",

    "--shadow-sm": "0 1px 1px rgb(17 19 24 / 0.04)",
    "--shadow-md": "0 8px 24px rgb(17 19 24 / 0.08)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#0a0a0a",
    "--surface": "#141414",
    "--surface-elevated": "#1a1a1a",

    "--border": "#2a2a2a",
    "--border-strong": "#3d3d3d",
    "--border-extra": "#6b6b6b",

    "--text": "#f4f4f5",
    "--text-muted": "#a1a1aa",
    "--text-soft": "#71717a",
    "--on-accent": "#111318",

    "--accent": "#f97316",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 18%, transparent)",

    "--success": "#4ade80",
    "--warning": "#eab308",
    "--danger": "#f87171",
    "--success-soft": "color-mix(in srgb, var(--success) 18%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 18%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 18%, transparent)",

    "--overlay": "rgb(0 0 0 / 0.55)",
    "--overlay-strong": "rgb(0 0 0 / 0.78)",

    "--chrome": "#000000",
    "--chrome-elevated": "#111111",
    "--chrome-border": "#2a1c12",
    "--chrome-text": "#f4f4f5",
    "--chrome-muted": "#8b8d96",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },

  /**
   * Light-only hex for PDFs and email (no CSS variables, no dark mode).
   * Keep in sync with crm_backend/src/lib/print-theme.ts.
   * accentSoft is 12% --accent on white (solid stand-in for color-mix).
   */
  print: {
    accent: "#f97316",
    accentSoft: "#feeee3",
    ink: "#111318",
    muted: "#5c6370",
    rule: "#e2e4ea",
    onAccent: "#111318",
    paper: "#f4f5f7",
    surface: "#ffffff",
  },
};
