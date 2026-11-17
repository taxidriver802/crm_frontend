# Theme tokens

**Source of truth:** palettes in [`themes/`](themes/), registered in [`registry.js`](registry.js). Tables below show **Ember**, the default; other palettes use the same keys with their own values. How the tokens are used: [`docs/design-language.md`](../../docs/design-language.md). Brand: [`brand.md`](brand.md). Tailwind mappings: [`tailwind.config.js`](../../tailwind.config.js).

## How theming works

- The palette's CSS is emitted into `#crm-palette-vars` (`app/layout.js`) as `[data-palette="<id>"]` (light) and `.dark[data-palette="<id>"]` (dark overrides).
- `next-themes` owns the **scheme** (`class="dark"` on `<html>`). The theme controller owns the **palette** (`data-palette`).
- The person's palette is saved with their preferences (`appearance.palette`); `null` means the company's. The browser also keeps `localStorage` `crm-palette` (`theme/constants.js`).
- Pages use CSS variables and token utilities only. Never branch on a palette id.
- JS that needs resolved values (charts, canvas) calls `useThemeTokens()` from `@/components/theme/theme-controller`.

Palettes: **Ember** (id `rooftop`, default, Joist's own), Azure, Slate, Emerald, Violet, Rose, Sand, Graphite. Ember was called Rooftop; the id stays `rooftop` because companies and preferences store ids. Ember is the only palette with dark ink on its accent (`--on-accent: #111318`); the rest use white. Graphite uses tighter radii (4 / 8px).

## Surfaces and text (Ember)

Warm neutrals: "paper and ink".

| Token                | Light                  | Dark                | Use                               |
| -------------------- | ---------------------- | ------------------- | --------------------------------- |
| `--bg`               | `#f6f5f1`              | `#111110`           | App canvas                        |
| `--surface`          | `#efede7`              | `#191917`           | Inputs, recessed panels           |
| `--surface-elevated` | `#ffffff`              | `#1f1f1d`           | Cards, top bar, menus             |
| `--border`           | `#e6e3db`              | `#2d2c29`           | Default hairline                  |
| `--border-strong`    | `#d3cfc5`              | `#3e3d39`           | Emphasis, scrollbars              |
| `--border-extra`     | `#8d897f`              | `#6f6d66`           | Rare stronger rule                |
| `--text`             | `#1b1a17`              | `#f2f1ec`           | Ink                               |
| `--text-muted`       | `#5f5d56`              | `#a8a69e`           | Secondary text                    |
| `--text-soft`        | `#8f8c84`              | `#76746d`           | Hints, timestamps                 |
| `--overlay`          | `rgb(17 19 24 / 0.45)` | `rgb(0 0 0 / 0.55)` | Modal and palette scrim           |
| `--overlay-strong`   | `rgb(17 19 24 / 0.72)` | `rgb(0 0 0 / 0.78)` | Lightbox                          |
| `--on-overlay`       | `#ffffff`              | `#ffffff`           | Text on scrims                    |

## Accent and status (Ember)

| Token            | Light                  | Dark      | Use                                             |
| ---------------- | ---------------------- | --------- | ----------------------------------------------- |
| `--accent`       | `#f97316`              | same      | Primary action, focus, selection, current step  |
| `--on-accent`    | `#111318`              | same      | Text on solid accent                            |
| `--accent-hover` | accent mixed 78% toward black | same | Hover. Never a second hue inside a palette |
| `--success`      | `#16a34a`              | `#4ade80` | Done                                            |
| `--warning`      | `#ca8a04`              | `#eab308` | Money owed, pipeline chips. Gold so it does not collide with the orange accent |
| `--danger`       | `#dc2626`              | `#f87171` | Overdue, needs you now                          |
| `--*-soft`       | 12% mix                | 18% mix   | Tinted backgrounds for the above                |

`bg-accent` is the **soft tint**, not solid `--accent`. Use `bg-accent-solid` or `bg-accent-soft` to be explicit; `text-accent` is the solid colour on text.

## Workbench layer (`app/workbench.css`)

Derived from the palette, so they work in every palette and scheme.

| Token | Value | Use |
| --- | --- | --- |
| `--d-row` / `--d-control` / `--d-pad` / `--d-gap` / `--d-section` / `--d-text` | 40 / 34 / 16 / 16 / 22 / 14px; compact 32 / 30 / 12 / 12 / 16 / 13px | Density, switched by `html[data-density="compact"]` |
| `--rail-w` / `--rail-w-collapsed` | 248px / 60px | Nav rail |
| `--rail-bg` | `--surface` 60% into `--bg` | Nav rail background |
| `--hover` / `--hover-strong` | `--text` at 5% / 9% | Row and control hover |
| `--selected` | `--accent` at 11% | Selected rows and items |
| `--ring` | `--accent` at 55% | Focus ring |
| `--shadow-pop` | Soft, offset shadow | Floating layers only |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Panels and menus |

## Shape, elevation, motion, charts

| Token | Value |
| --- | --- |
| `--radius-sm` / `--radius-md` / `--radius-lg` | 6 / 8 / 10px (`rounded-theme-sm|md|lg`) |
| `--shadow-sm` / `--shadow-md` | Quiet; hierarchy is mostly borders |
| `--duration-fast` / `--ease-standard` | 150ms / `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--chart-1` … `--chart-4` | accent, success, warning, muted text |

## Chrome tokens (unused on screen)

Every palette still defines `--chrome`, `--chrome-elevated`, `--chrome-border`, `--chrome-text`, `--chrome-muted` and `--chrome-hover` (Ember light `--chrome` is `#363a43`). They styled the dark sidebar before the Workbench; the rail now uses `--rail-bg`, and no component reads them. Ember's `--chrome` value is still the tile colour of the Joist mark ([`brand.md`](brand.md)).

## Print and email

PDFs and invite email use each palette's light-only `print` map (`resolvePrintTheme(paletteId)`); backend copy `crm_backend/src/lib/print-theme.ts`. `accentSoft` is a solid 12% mix on white because mail and PDF cannot use `color-mix`. Estimate and invoice PDFs share `PRINT_PDF` + `pdf-layout.ts`.

Ember print: `accent #f97316`, `accentSoft #feeee3`, `onAccent #111318`, `surface #ffffff`, and the neutrals `ink #111318`, `muted #5c6370`, `rule #e2e4ea`, `paper #f4f5f7`. Those neutrals are the pre-Workbench cool greys in every palette; they were not moved to the warm screen neutrals.

## Light-only customer pages

Every `/public/*` route (portal, intake, estimate, invoice) forces the light scheme with the company's palette (`forcedTheme="light"` in `ThemeProvider`, `theme/public-path.js`). They are document-like, they match the light PDFs, and a salesperson previewing a link must not leak their dark theme onto it. Pages still use CSS variables.

## PWA

Install chrome is Joist's: company palette and logo never change the home-screen icon or manifest colours.

- Manifest `theme_color` / `background_color` and the viewport fallback: Ember light `--bg`, via `resolvePwaTheme()`.
- Icons, favicon and the offline page mark: generated from `src/assets/brand/joist-mark.svg` by `npm run icons:pwa` (`-- --check` fails on drift). File list in [`brand.md`](brand.md).
- Offline shell (`public/offline.html`): Ember light values, hardcoded.
- At runtime `watchThemeColorMeta()` keeps `<meta name="theme-color">` on the active palette's computed `--bg`, and re-applies it after Next rewrites the head on client navigation. Signed in, that is the person's palette or else the company's.
