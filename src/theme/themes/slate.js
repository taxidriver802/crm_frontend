/** Cooler teal alternative to Rooftop. Same token keys; pages must not branch on this id. */
export const slate = {
  id: "slate",
  label: "Slate",
  preview: {
    bg: "#f3f5f6",
    surface: "#e8ecee",
    accent: "#0f766e",
  },
  light: {
    "--bg": "#f3f5f6",
    "--surface": "#e8ecee",
    "--surface-elevated": "#ffffff",

    "--border": "#dde3e6",
    "--border-strong": "#c5ced3",
    "--border-extra": "#7e8b93",

    "--text": "#0f1417",
    "--text-muted": "#5a656c",
    "--text-soft": "#849099",
    "--on-accent": "#ffffff",

    "--accent": "#0f766e",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#16a34a",
    "--warning": "#f59e0b",
    "--danger": "#dc2626",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(15 20 23 / 0.45)",
    "--overlay-strong": "rgb(15 20 23 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#2a3338",
    "--chrome-elevated": "#343e44",
    "--chrome-border": "#445056",
    "--chrome-text": "#f2f5f6",
    "--chrome-muted": "#a0abb2",
    "--chrome-hover": "color-mix(in srgb, #ffffff 10%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",

    "--shadow-sm": "0 1px 1px rgb(15 20 23 / 0.04)",
    "--shadow-md": "0 8px 24px rgb(15 20 23 / 0.08)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#0e1214",
    "--surface": "#151a1d",
    "--surface-elevated": "#1b2226",

    "--border": "#2a3338",
    "--border-strong": "#3a464c",
    "--border-extra": "#6b787f",

    "--text": "#e8eef0",
    "--text-muted": "#96a0a6",
    "--text-soft": "#6d777d",
    "--on-accent": "#ffffff",

    "--accent": "#0f766e",
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

    "--chrome": "#0b1012",
    "--chrome-elevated": "#12181c",
    "--chrome-border": "#243036",
    "--chrome-text": "#e8eef0",
    "--chrome-muted": "#879298",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },

  print: {
    accent: "#0f766e",
    accentSoft: "#e2eeed",
    ink: "#0f1417",
    muted: "#5a656c",
    rule: "#dde3e6",
    onAccent: "#ffffff",
    paper: "#f3f5f6",
    surface: "#ffffff",
  },
};
