/** Emerald theme. Same token keys as Azure; pages must not branch on this id. */
export const emerald = {
    id: "emerald",
    label: "Emerald",
    preview: {
    bg: "#f3f7f5",
    surface: "#e7efeb",
    accent: "#059669",
    },
    light: {
    "--bg": "#f3f7f5",
    "--surface": "#e7efeb",
    "--surface-elevated": "#ffffff",
    "--border": "#d9e3de",
    "--border-strong": "#c2d0c9",
    "--border-extra": "#82958c",
    
    "--text": "#101814",
    "--text-muted": "#52635b",
    "--text-soft": "#84918b",
    "--on-accent": "#ffffff",
    
    "--accent": "#059669",
    "--accent-hover": "color-mix(in srgb, var(--accent) 78%, #000000)",
    "--accent-soft": "color-mix(in srgb, var(--accent) 12%, transparent)",
    
    "--success": "#16a34a",
    "--warning": "#d97706",
    "--danger": "#dc2626",
    "--success-soft": "color-mix(in srgb, var(--success) 12%, transparent)",
    "--warning-soft": "color-mix(in srgb, var(--warning) 12%, transparent)",
    "--danger-soft": "color-mix(in srgb, var(--danger) 12%, transparent)",
    
    "--overlay": "rgb(16 24 20 / 0.45)",
    "--overlay-strong": "rgb(16 24 20 / 0.72)",
    "--on-overlay": "#ffffff",
    
    "--chrome": "#10231b",
    "--chrome-elevated": "#173126",
    "--chrome-border": "#264438",
    "--chrome-text": "#f1f7f4",
    "--chrome-muted": "#9cafa6",
    "--chrome-hover": "color-mix(in srgb, #ffffff 8%, transparent)",
    
    "--chart-1": "var(--accent)",
    "--chart-2": "var(--success)",
    "--chart-3": "var(--warning)",
    "--chart-4": "var(--text-muted)",
    
    "--radius-sm": "6px",
    "--radius-md": "8px",
    "--radius-lg": "10px",
    
    "--shadow-sm": "0 1px 1px rgb(16 24 20 / 0.04)",
    "--shadow-md": "0 8px 24px rgb(16 24 20 / 0.08)",
    
    "--duration-fast": "150ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
    
    },
    dark: {
    "--bg": "#0d1511",
    "--surface": "#121d18",
    "--surface-elevated": "#19261f",
    "--border": "#26372f",
    "--border-strong": "#364b41",
    "--border-extra": "#657b70",
    
    "--text": "#e9f1ed",
    "--text-muted": "#98aaa1",
    "--text-soft": "#6e7f77",
    "--on-accent": "#ffffff",
    
    "--accent": "#10b981",
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
    
    "--chrome": "#09110d",
    "--chrome-elevated": "#101b15",
    "--chrome-border": "#203128",
    "--chrome-text": "#e9f1ed",
    "--chrome-muted": "#879990",
    "--chrome-hover": "color-mix(in srgb, #ffffff 7%, transparent)",
    
    "--shadow-sm": "0 1px 1px rgb(0 0 0 / 0.35)",
    "--shadow-md": "0 10px 28px rgb(0 0 0 / 0.4)",
    
    },
    print: {
    accent: "#059669",
    accentSoft: "#dff5ec",
    ink: "#101814",
    muted: "#52635b",
    rule: "#d9e3de",
    onAccent: "#ffffff",
    paper: "#f3f7f5",
    surface: "#ffffff",
    },
    };