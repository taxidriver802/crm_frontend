/** Warm rose. Same token keys as Rooftop; pages must not branch on this id. */
export const rose = {
  id: "rose",
  label: "Rose",
  preview: {
    bg: "#f8f3f4",
    surface: "#f1e8ea",
    accent: "#e11d48",
  },
  light: {
    "--bg": "#f8f3f4",
    "--surface": "#f1e8ea",
    "--surface-elevated": "#ffffff",

    "--border": "#e8dce0",
    "--border-strong": "#d4c2c8",
    "--border-extra": "#9a848b",

    "--text": "#1a1114",
    "--text-muted": "#6a575c",
    "--text-soft": "#917f84",
    "--on-accent": "#ffffff",

    "--accent": "#e11d48",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#16a34a",
    "--warning": "#d97706",
    "--danger": "#be123c",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(26 17 20 / 0.45)",
    "--overlay-strong": "rgb(26 17 20 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#3a2c32",
    "--chrome-elevated": "#443840",
    "--chrome-border": "#564850",
    "--chrome-text": "#f8f2f3",
    "--chrome-muted": "#c4a8b0",
    "--chrome-hover": "color-mix(in srgb, #ffffff 10%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",

    "--shadow-sm": "0 1px 1px rgb(26 17 20 / 0.04)",
    "--shadow-md": "0 8px 24px rgb(26 17 20 / 0.08)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#140e10",
    "--surface": "#1c1417",
    "--surface-elevated": "#24191d",

    "--border": "#3a2a30",
    "--border-strong": "#4c3840",
    "--border-extra": "#7a626a",

    "--text": "#f4eaec",
    "--text-muted": "#b39aa0",
    "--text-soft": "#867078",
    "--on-accent": "#ffffff",

    "--accent": "#fb7185",
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

    "--chrome": "#100b0d",
    "--chrome-elevated": "#181214",
    "--chrome-border": "#322026",
    "--chrome-text": "#f4eaec",
    "--chrome-muted": "#a88890",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },
  print: {
    accent: "#e11d48",
    accentSoft: "#fbe4e9",
    ink: "#1a1114",
    muted: "#6a575c",
    rule: "#e8dce0",
    onAccent: "#ffffff",
    paper: "#f8f3f4",
    surface: "#ffffff",
  },
};
