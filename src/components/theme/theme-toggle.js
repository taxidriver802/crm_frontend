"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons";
import { PalettePicker } from "@/components/theme/palette-picker";
import { cx } from "@/lib/cx";

/** Light/dark toggle with a chevron that reveals named palettes. */
export function ThemeToggle({
  className = "",
  variant = "button",
  tone = "default",
}) {
  const { theme, setTheme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const chrome = tone === "chrome";
  const iconOnly = variant === "icon";

  useEffect(() => {
    if (!paletteOpen) return undefined;

    function handlePointerDown(e) {
      if (rootRef.current?.contains(e.target)) return;
      setPaletteOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setPaletteOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [paletteOpen]);

  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const next = current === "dark" ? "light" : "dark";
  const label = current === "dark" ? "Light mode" : "Dark mode";
  const icon = current === "dark" ? "sun" : "moon";

  const innerBtn = cx(
    "inline-flex items-center border-0 bg-transparent transition",
    chrome ? "text-chrome hover:bg-chrome-hover" : "hover:bg-accent-soft",
  );

  return (
    <div
      ref={rootRef}
      className={cx("relative", !iconOnly && "w-full", className)}
    >
      <div
        className={cx(
          "flex items-stretch gap-0 overflow-hidden p-0",
          iconOnly ? "icon-btn w-auto" : "btn",
          chrome && "btn-chrome",
          !iconOnly && "w-full",
        )}
      >
        <button
          type="button"
          onClick={() => setTheme(next)}
          className={cx(
            innerBtn,
            iconOnly
              ? "h-full w-9 justify-center"
              : "min-w-0 flex-1 justify-start gap-2 px-3 py-2",
          )}
          aria-label={label}
          title={label}
        >
          <Icon name={icon} className="h-4 w-4" />
          {iconOnly ? null : <span>{label}</span>}
        </button>
        <button
          type="button"
          className={cx(
            innerBtn,
            "border-l",
            chrome ? "border-chrome" : "border-base",
            iconOnly ? "h-full w-8 justify-center" : "justify-center px-2.5",
          )}
          aria-label="Color palettes"
          aria-haspopup="listbox"
          aria-expanded={paletteOpen}
          aria-controls={menuId}
          title="Color palettes"
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Icon
            name="chevronDown"
            className={cx(
              "h-3.5 w-3.5 transition-transform duration-fast",
              paletteOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {paletteOpen ? (
        <div
          id={menuId}
          className={cx(
            iconOnly
              ? "dropdown-panel absolute right-0 top-full z-50 mt-1 w-44 p-1"
              : "mt-1",
            !iconOnly && chrome && "rounded-theme-md border border-chrome p-1",
            !iconOnly && !chrome && "rounded-theme-md border border-base p-1",
          )}
        >
          <PalettePicker
            tone={tone}
            onPicked={() => setPaletteOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
