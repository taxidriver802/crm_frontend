/** Cool violet. Same token keys as Rooftop; pages must not branch on this id. */
export const violet = {
  id: "violet",
  label: "Violet",
  preview: {
    bg: "#f6f4f9",
    surface: "#eeeaf3",
    accent: "#7c3aed",
  },
  light: {
    "--bg": "#f6f4f9",
    "--surface": "#eeeaf3",
    "--surface-elevated": "#ffffff",

    "--border": "#e4dde9",
    "--border-strong": "#d0c6db",
    "--border-extra": "#8b7f99",

    "--text": "#16111c",
    "--text-muted": "#5e5668",
    "--text-soft": "#8c8496",
    "--on-accent": "#ffffff",

    "--accent": "#7c3aed",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#16a34a",
    "--warning": "#d97706",
    "--danger": "#dc2626",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(22 17 28 / 0.45)",
    "--overlay-strong": "rgb(22 17 28 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#322a3a",
    "--chrome-elevated": "#3c3448",
    "--chrome-border": "#4e4460",
    "--chrome-text": "#f4f1f8",
    "--chrome-muted": "#b4a8c4",
    "--chrome-hover": "color-mix(in srgb, #ffffff 10%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",

    "--shadow-sm": "0 1px 1px rgb(22 17 28 / 0.04)",
    "--shadow-md": "0 8px 24px rgb(22 17 28 / 0.08)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#110e16",
    "--surface": "#19141f",
    "--surface-elevated": "#211b28",

    "--border": "#322a3c",
    "--border-strong": "#443a50",
    "--border-extra": "#6e6478",

    "--text": "#eeeaf4",
    "--text-muted": "#a396b0",
    "--text-soft": "#7a7086",
    "--on-accent": "#ffffff",

    "--accent": "#8b5cf6",
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

    "--chrome": "#0e0b12",
    "--chrome-elevated": "#16121c",
    "--chrome-border": "#2c2438",
    "--chrome-text": "#eeeaf4",
    "--chrome-muted": "#9588a8",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },
  print: {
    accent: "#7c3aed",
    accentSoft: "#efe7fd",
    ink: "#16111c",
    muted: "#5e5668",
    rule: "#e4dde9",
    onAccent: "#ffffff",
    paper: "#f6f4f9",
    surface: "#ffffff",
  },
};
