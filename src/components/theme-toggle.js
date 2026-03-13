'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === 'system' ? systemTheme : theme;
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="rounded-md border border-base bg-surface px-3 py-2 text-sm hover:bg-accent-soft"
      aria-label="Toggle theme"
    >
      {current === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
