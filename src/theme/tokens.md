# Theme tokens

**Source of truth:** palettes in [`src/theme/themes/`](themes/), registered in [`src/theme/registry.js`](registry.js).

Runtime CSS is emitted into `#crm-palette-vars` as:

- `[data-palette="<id>"]` — light tokens
- `.dark[data-palette="<id>"]` — dark overrides

`next-themes` still owns **color scheme** (`class="dark"` on `<html>`). The controller owns **palette** (`data-palette`). Pages must use CSS variables / token utilities only — never palette ids.

Named palettes: **Rooftop** (default, brand orange `#f97316` / `rgb(249, 115, 22)`, dark `--on-accent`), **Azure** (previous blue `#2563eb`), and **Slate** (teal `#0f766e`). The picker writes `localStorage` key `crm-palette`. Public `/public/*` routes force Rooftop so a salesperson’s choice does not leak onto customer links. PDFs/email stay on the backend Rooftop print map.

Tailwind mappings: [`tailwind.config.js`](../../tailwind.config.js).

PDFs and invite email consume **print hex** from each palette’s `print` map (light only). Backend copy: `crm_backend/src/lib/print-theme.ts`.

## Surfaces

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--bg` | `#f4f5f7` | `#0a0a0a` | App canvas (Rooftop dark; Azure/Slate use cooler charcoal) |
| `--surface` | `#eceef2` | `#141414` | Inputs, recessed panels |
| `--surface-elevated` | `#ffffff` | `#1a1a1a` | Cards, topbar, dropdowns |
| `--overlay` | `rgb(17 19 24 / 0.45)` | `rgb(0 0 0 / 0.55)` | Modal/command-palette scrim |
| `--overlay-strong` | `rgb(17 19 24 / 0.72)` | `rgb(0 0 0 / 0.78)` | Lightbox |
| `--on-overlay` | `#ffffff` | `#ffffff` | Text on dark scrims |
| `--border` | `#e2e4ea` | `#2a2b32` | Default hairline |
| `--border-strong` | `#cfd3dc` | `#3a3b44` | Emphasis / scrollbars |
| `--border-extra` | `#8b909c` | `#6b6d78` | Rare stronger rule |

## Chrome (shell / auth rail)

Used by the desktop sidebar and mobile bottom nav. Light scheme uses a mid charcoal grey rail (still darker than the page, softer than pure black). Dark scheme stays near-black. Each palette keeps a slight hue tint on chrome.

| Token | Light (Rooftop) | Dark (Rooftop) |
| --- | --- | --- |
| `--chrome` | `#363a43` | `#000000` |
| `--chrome-elevated` | `#40454f` | `#111111` |
| `--chrome-border` | `#4e463c` | `#2a1c12` |
| `--chrome-text` | `#f4f4f5` | `#f4f4f5` |
| `--chrome-muted` | `#a8adb8` | `#8b8d96` |
| `--chrome-hover` | 10% white mix | 7% white mix |

## Text

| Token | Light | Dark |
| --- | --- | --- |
| `--text` | `#111318` | `#f4f4f5` |
| `--text-muted` | `#5c6370` | `#a1a1aa` |
| `--text-soft` | `#8b919c` | `#71717a` |
| `--on-accent` | `#111318` (Rooftop) / `#ffffff` (Azure, Slate) | same |

## Accent and semantic

`--accent` is **#f97316** on Rooftop, **#2563eb** on Azure, and **#0f766e** on Slate, same in light and dark. Hover is `color-mix` with black — do not add a second hue inside a palette. Rooftop `--warning` is shifted to gold so it does not collide with the orange accent.

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` | `#f97316` (Rooftop) / `#2563eb` (Azure) / `#0f766e` (Slate) | same |
| `--accent-hover` | mix 78% toward black | mix 78% toward black |
| `--accent-soft` | 12% mix | 18% mix |
| `--success` | `#16a34a` | `#4ade80` |
| `--warning` | `#ca8a04` (Rooftop) / `#f59e0b` (Azure, Slate) | `#eab308` (Rooftop) / `#fbbf24` (Azure, Slate) |
| `--danger` | `#dc2626` | `#f87171` |
| `--*-soft` | 12% mix | 18% mix |

`bg-accent` is the **soft tint**, not solid `--accent`. Use `bg-accent-solid` or `bg-accent-soft` when you need to be explicit. Use `text-accent` for the solid accent color on text.

JS that needs resolved values (charts, canvas) should call `useThemeTokens()` from `@/components/theme/theme-controller`.

## Charts (Phase 6)

| Token | Role |
| --- | --- |
| `--chart-1` | Primary series (accent) |
| `--chart-2` | Secondary (success) |
| `--chart-3` | Tertiary (warning) |
| `--chart-4` | Quaternary (muted text) |

## Shape, elevation, motion

| Token | Value |
| --- | --- |
| `--radius-sm` / `--radius-md` / `--radius-lg` | `6px` / `8px` / `10px` |
| `--shadow-sm` / `--shadow-md` | Quiet; hierarchy is mostly borders |
| `--duration-fast` | `150ms` |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |

Tailwind: `rounded-theme-sm|md|lg` maps to radius tokens.

## Print / email (Phase 8)

Light-only hex from `resolvePrintTheme(paletteId)` / palette `print`. No dark mode. `accentSoft` is a solid 12% mix of accent on white (mail/PDF cannot use `color-mix`).

| Token | Hex | Source |
| --- | --- | --- |
| `accent` | `#f97316` | `--accent` |
| `accentSoft` | `#feeee3` | 12% `--accent` on white |
| `ink` | `#111318` | `--text` |
| `muted` | `#5c6370` | `--text-muted` |
| `rule` | `#e2e4ea` | `--border` |
| `onAccent` | `#111318` | `--on-accent` |
| `paper` | `#f4f5f7` | `--bg` |
| `surface` | `#ffffff` | `--surface-elevated` |

Estimate and invoice PDFs share `PRINT_PDF` + `pdf-layout.ts`. Invite HTML interpolates the same hex.

## PWA (Phase 9)

`resolvePwaTheme()` reads light `--bg` / `--accent` / `--on-accent`.

| Use | Token | Hex |
| --- | --- | --- |
| Manifest `theme_color` / `background_color`, viewport fallback | `--bg` | `#f4f5f7` |
| App icons | `--accent` / `--on-accent` | `#f97316` / `#111318` |

Runtime `theme-color` still follows computed `--bg` (light or dark) via `syncThemeColorMeta()`.

## Public customer surfaces (Phase 7)

`/public/portal/*` and `/public/estimate/*` **force light**. They do not follow the salesperson’s stored scheme or OS `prefers-color-scheme`.

Reasons: these are document-like customer views (aligned with light PDFs/email in Phase 8), and previewing a link on the same origin must not leak a dark `localStorage` theme into the customer chrome.

Implemented with `forcedTheme="light"` in `ThemeProvider` when the path is under `/public/`. Pages still use CSS variables — they do not hardcode light hex.
