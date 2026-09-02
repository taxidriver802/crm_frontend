"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";

/** Light/dark only. Named palettes are switched via ThemeController (Phase 10 picker). */
export function ThemeToggle({ className = "", variant = "button" }) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const next = current === "dark" ? "light" : "dark";
  const label = current === "dark" ? "Light mode" : "Dark mode";
  const icon = current === "dark" ? "sun" : "moon";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cx(variant === "icon" ? "icon-btn" : "btn", className)}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} className="h-4 w-4" />
      {variant === "icon" ? null : <span>{label}</span>}
    </button>
  );
}
