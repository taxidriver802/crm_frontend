/** Near-monochrome zinc. Same token keys as Rooftop; pages must not branch on this id. */
export const graphite = {
  id: "graphite",
  label: "Graphite",
  preview: {
    bg: "#f4f4f5",
    surface: "#e4e4e7",
    accent: "#3f3f46",
  },
  light: {
    "--bg": "#f4f4f5",
    "--surface": "#e4e4e7",
    "--surface-elevated": "#ffffff",

    "--border": "#d4d4d8",
    "--border-strong": "#a1a1aa",
    "--border-extra": "#71717a",

    "--text": "#09090b",
    "--text-muted": "#52525b",
    "--text-soft": "#71717a",
    "--on-accent": "#ffffff",

    "--accent": "#3f3f46",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",

    "--success": "#15803d",
    "--warning": "#a16207",
    "--danger": "#b91c1c",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",

    "--overlay": "rgb(9 9 11 / 0.45)",
    "--overlay-strong": "rgb(9 9 11 / 0.72)",
    "--on-overlay": "#ffffff",

    "--chrome": "#3f3f46",
    "--chrome-elevated": "#4a4a52",
    "--chrome-border": "#5a5a64",
    "--chrome-text": "#fafafa",
    "--chrome-muted": "#b0b0ba",
    "--chrome-hover": "color-mix(in srgb, #ffffff 10%, transparent)",

    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",

    "--radius-sm": "4px",
    "--radius-md": "6px",
    "--radius-lg": "8px",

    "--shadow-sm": "0 1px 1px rgb(9 9 11 / 0.06)",
    "--shadow-md": "0 8px 24px rgb(9 9 11 / 0.1)",

    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dark: {
    "--bg": "#09090b",
    "--surface": "#18181b",
    "--surface-elevated": "#27272a",

    "--border": "#3f3f46",
    "--border-strong": "#52525b",
    "--border-extra": "#71717a",

    "--text": "#fafafa",
    "--text-muted": "#a1a1aa",
    "--text-soft": "#71717a",
    "--on-accent": "#09090b",

    "--accent": "#d4d4d8",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 18%, transparent)",

    "--success": "#4ade80",
    "--warning": "#facc15",
    "--danger": "#f87171",
    "--success-soft": "color-mix(in srgb, var(--success) 18%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 18%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 18%, transparent)",

    "--overlay": "rgb(0 0 0 / 0.55)",
    "--overlay-strong": "rgb(0 0 0 / 0.78)",

    "--chrome": "#000000",
    "--chrome-elevated": "#18181b",
    "--chrome-border": "#27272a",
    "--chrome-text": "#fafafa",
    "--chrome-muted": "#a1a1aa",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",

    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.4)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.5)",
  },
  print: {
    accent: "#3f3f46",
    accentSoft: "#e8e8e9",
    ink: "#09090b",
    muted: "#52525b",
    rule: "#d4d4d8",
    onAccent: "#ffffff",
    paper: "#f4f4f5",
    surface: "#ffffff",
  },
};
