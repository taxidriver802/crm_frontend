/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/lib/**/*.{js,jsx,ts,tsx}",
    "./src/theme/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        app: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
        },
        overlay: {
          DEFAULT: "var(--overlay)",
          strong: "var(--overlay-strong)",
        },
        chrome: {
          DEFAULT: "var(--chrome)",
          elevated: "var(--chrome-elevated)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          solid: "var(--accent)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
        },
      },
      textColor: {
        main: "var(--text)",
        muted: "var(--text-muted)",
        soft: "var(--text-soft)",
        "on-accent": "var(--on-accent)",
        "on-overlay": "var(--on-overlay)",
        chrome: "var(--chrome-text)",
        "chrome-muted": "var(--chrome-muted)",
      },
      backgroundColor: {
        app: "var(--bg)",
        overlay: {
          DEFAULT: "var(--overlay)",
          strong: "var(--overlay-strong)",
        },
        chrome: {
          DEFAULT: "var(--chrome)",
          elevated: "var(--chrome-elevated)",
          hover: "var(--chrome-hover)",
        },
        // Preserve historical meaning: bg-accent is the soft tint, not solid accent.
        accent: {
          DEFAULT: "var(--accent-soft)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          solid: "var(--accent)",
        },
      },
      borderColor: {
        base: "var(--border)",
        strong: "var(--border-strong)",
        extra: "var(--border-extra)",
        chrome: "var(--chrome-border)",
      },
      zIndex: {
        overlay: "40",
        modal: "50",
        palette: "80",
        dialog: "100",
        lightbox: "120",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      borderRadius: {
        "theme-sm": "var(--radius-sm)",
        "theme-md": "var(--radius-md)",
        "theme-lg": "var(--radius-lg)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
      },
    },
  },
  plugins: [],
};
