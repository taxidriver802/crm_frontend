/** Previous default blue. Same token keys as Rooftop; pages must not branch on this id. */
export const azure = {
  id: "azure",
  label: "Azure",
  preview: {
    bg: "#f4f5f7",
    surface: "#eceef2",
    accent: "#2563eb",
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
    "--on-accent": "#ffffff",

    "--accent": "#2563eb",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#16a34a",
    "--warning": "#f59e0b",
    "--danger": "#dc2626",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(17 19 24 / 0.45)",
    "--overlay-strong": "rgb(17 19 24 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#14161c",
    "--chrome-elevated": "#1c1f26",
    "--chrome-border": "#2a2e38",
    "--chrome-text": "#f4f4f5",
    "--chrome-muted": "#9aa0ab",
    "--chrome-hover": "color-mix(in srgb, #ffffff 8%, transparent)",

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
    "--bg": "#101114",
    "--surface": "#16171c",
    "--surface-elevated": "#1c1d24",

    "--border": "#2a2b32",
    "--border-strong": "#3a3b44",
    "--border-extra": "#6b6d78",

    "--text": "#ececef",
    "--text-muted": "#9b9ca6",
    "--text-soft": "#6f707a",
    "--on-accent": "#ffffff",

    "--accent": "#2563eb",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 18%, transparent)",

    "--success": "#4ade80",
    "--warning": "#fbbf24",
    "--danger": "#f87171",
    "--success-soft": "color-mix(in srgb, var(--success) 18%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 18%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 18%, transparent)",

    "--overlay": "rgb(0 0 0 / 0.55)",
    "--overlay-strong": "rgb(0 0 0 / 0.78)",

    "--chrome": "#0c0d10",
    "--chrome-elevated": "#14151a",
    "--chrome-border": "#26272e",
    "--chrome-text": "#ececef",
    "--chrome-muted": "#8b8d96",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },

  print: {
    accent: "#2563eb",
    accentSoft: "#e5ecfd",
    ink: "#111318",
    muted: "#5c6370",
    rule: "#e2e4ea",
    onAccent: "#ffffff",
    paper: "#f4f5f7",
    surface: "#ffffff",
  },
};
