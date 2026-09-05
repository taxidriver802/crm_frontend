/** Warm paper and terracotta. Same token keys as Rooftop; pages must not branch on this id. */
export const sand = {
  id: "sand",
  label: "Sand",
  preview: {
    bg: "#f6f1e8",
    surface: "#eee6d8",
    accent: "#9a3412",
  },
  light: {
    "--bg": "#f6f1e8",
    "--surface": "#eee6d8",
    "--surface-elevated": "#fffdf8",

    "--border": "#e4d9c8",
    "--border-strong": "#d0c0a8",
    "--border-extra": "#9a8b74",

    "--text": "#1c1610",
    "--text-muted": "#6b5e4e",
    "--text-soft": "#948675",
    "--on-accent": "#ffffff",

    "--accent": "#9a3412",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#4d7c0f",
    "--warning": "#a16207",
    "--danger": "#b91c1c",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(28 22 16 / 0.45)",
    "--overlay-strong": "rgb(28 22 16 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#1a1510",
    "--chrome-elevated": "#241e16",
    "--chrome-border": "#3a2c20",
    "--chrome-text": "#f6f1e8",
    "--chrome-muted": "#b5a48c",
    "--chrome-hover": "color-mix(in srgb, #ffffff 8%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",

    "--shadow-sm": "0 1px 1px rgb(28 22 16 / 0.05)",
    "--shadow-md": "0 8px 24px rgb(28 22 16 / 0.09)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#14110c",
    "--surface": "#1c1812",
    "--surface-elevated": "#252017",

    "--border": "#3a3328",
    "--border-strong": "#4c4436",
    "--border-extra": "#7a705c",

    "--text": "#f3ece0",
    "--text-muted": "#b0a490",
    "--text-soft": "#857a68",
    "--on-accent": "#ffffff",

    "--accent": "#ea580c",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 18%, transparent)",

    "--success": "#a3e635",
    "--warning": "#facc15",
    "--danger": "#f87171",
    "--success-soft": "color-mix(in srgb, var(--success) 18%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 18%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 18%, transparent)",

    "--overlay": "rgb(0 0 0 / 0.55)",
    "--overlay-strong": "rgb(0 0 0 / 0.78)",

    "--chrome": "#100e0a",
    "--chrome-elevated": "#18140e",
    "--chrome-border": "#32281c",
    "--chrome-text": "#f3ece0",
    "--chrome-muted": "#a89880",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
  },
  print: {
    accent: "#9a3412",
    accentSoft: "#f3e7e3",
    ink: "#1c1610",
    muted: "#6b5e4e",
    rule: "#e4d9c8",
    onAccent: "#ffffff",
    paper: "#f6f1e8",
    surface: "#fffdf8",
  },
};
