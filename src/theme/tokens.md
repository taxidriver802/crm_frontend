# Theme tokens

**Source of truth:** [`src/theme/themes/rooftop.js`](themes/rooftop.js), registered in [`src/theme/registry.js`](registry.js).

Runtime CSS is emitted into `#crm-palette-vars` as:

- `[data-palette="<id>"]` — light tokens
- `.dark[data-palette="<id>"]` — dark overrides

`next-themes` still owns **color scheme** (`class="dark"` on `<html>`). The controller owns **palette** (`data-palette`). Pages must use CSS variables / token utilities only — never palette ids.

Tailwind mappings: [`tailwind.config.js`](../../tailwind.config.js).

PDFs and invite email consume **print hex** from each palette’s `print` map (light only). Backend copy: `crm_backend/src/lib/print-theme.ts`.

## Surfaces

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--bg` | `#f4f5f7` | `#101114` | App canvas |
| `--surface` | `#eceef2` | `#16171c` | Inputs, recessed panels |
| `--surface-elevated` | `#ffffff` | `#1c1d24` | Cards, topbar, dropdowns |
| `--overlay` | `rgb(17 19 24 / 0.45)` | `rgb(0 0 0 / 0.55)` | Modal/command-palette scrim |
| `--overlay-strong` | `rgb(17 19 24 / 0.72)` | `rgb(0 0 0 / 0.78)` | Lightbox |
| `--on-overlay` | `#ffffff` | `#ffffff` | Text on dark scrims |
| `--border` | `#e2e4ea` | `#2a2b32` | Default hairline |
| `--border-strong` | `#cfd3dc` | `#3a3b44` | Emphasis / scrollbars |
| `--border-extra` | `#8b909c` | `#6b6d78` | Rare stronger rule |

## Chrome (shell / auth rail)

Used by the desktop sidebar and mobile bottom nav. Stays dark in both schemes (Jobber-style field rail).

| Token | Light | Dark |
| --- | --- | --- |
| `--chrome` | `#14161c` | `#0c0d10` |
| `--chrome-elevated` | `#1c1f26` | `#14151a` |
| `--chrome-border` | `#2a2e38` | `#26272e` |
| `--chrome-text` | `#f4f4f5` | `#ececef` |
| `--chrome-muted` | `#9aa0ab` | `#8b8d96` |
| `--chrome-hover` | 8% white mix | 7% white mix |

## Text

| Token | Light | Dark |
| --- | --- | --- |
| `--text` | `#111318` | `#ececef` |
| `--text-muted` | `#5c6370` | `#9b9ca6` |
| `--text-soft` | `#8b919c` | `#6f707a` |
| `--on-accent` | `#ffffff` | `#ffffff` |

## Accent and semantic

`--accent` is **#2563eb in both schemes**. Hover is `color-mix` with black — do not add a second blue.

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` | `#2563eb` | `#2563eb` |
| `--accent-hover` | mix 78% toward black | mix 78% toward black |
| `--accent-soft` | 12% mix | 18% mix |
| `--success` | `#16a34a` | `#4ade80` |
| `--warning` | `#f59e0b` | `#fbbf24` |
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
| `accent` | `#2563eb` | `--accent` |
| `accentSoft` | `#e5ecfd` | 12% `--accent` on white |
| `ink` | `#111318` | `--text` |
| `muted` | `#5c6370` | `--text-muted` |
| `rule` | `#e2e4ea` | `--border` |
| `onAccent` | `#ffffff` | `--on-accent` |
| `paper` | `#f4f5f7` | `--bg` |
| `surface` | `#ffffff` | `--surface-elevated` |

Estimate and invoice PDFs share `PRINT_PDF` + `pdf-layout.ts`. Invite HTML interpolates the same hex.

PWA/layout `theme-color` is synced at runtime from `--bg`. Static fallback in `layout.js` is still indigo `#6366f1` until Phase 9.

## Public customer surfaces (Phase 7)

`/public/portal/*` and `/public/estimate/*` **force light**. They do not follow the salesperson’s stored scheme or OS `prefers-color-scheme`.

Reasons: these are document-like customer views (aligned with light PDFs/email in Phase 8), and previewing a link on the same origin must not leak a dark `localStorage` theme into the customer chrome.

Implemented with `forcedTheme="light"` in `ThemeProvider` when the path is under `/public/`. Pages still use CSS variables — they do not hardcode light hex.
