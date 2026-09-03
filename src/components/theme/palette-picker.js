"use client";

import { useThemeController } from "@/components/theme/theme-controller";
import { cx } from "@/lib/cx";

export function PalettePicker({ className = "", tone = "default", onPicked }) {
  const { paletteId, setPaletteId, palettes } = useThemeController();
  const chrome = tone === "chrome";

  return (
    <div
      className={cx("flex flex-col gap-0.5", className)}
      role="radiogroup"
      aria-label="Color palette"
    >
      {palettes.map((palette) => {
        const selected = paletteId === palette.id;
        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cx(
              "flex w-full items-center justify-start gap-2 rounded-theme-md px-2.5 py-2 text-left text-xs font-medium transition",
              chrome
                ? "text-chrome hover:bg-chrome-hover"
                : "hover:bg-accent-soft",
              selected && (chrome ? "bg-chrome-elevated" : "bg-accent-soft"),
            )}
            onClick={() => {
              setPaletteId(palette.id);
              onPicked?.();
            }}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: palette.preview.accent }}
              aria-hidden
            />
            {palette.label}
          </button>
        );
      })}
    </div>
  );
}
