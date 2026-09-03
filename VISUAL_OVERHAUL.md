# Visual Overhaul Checklist

Working roadmap for the Rooftop Realty CRM visual overhaul. Mark items `[x]` as they land. Do not start a later phase’s restyle work until that phase’s required foundation is done.

Token catalog: `[src/theme/tokens.md](src/theme/tokens.md)`

---

## Phase 1 — Token and Tailwind foundation

Goal: one token vocabulary used by CSS and Tailwind. No visual-language redesign.

- [x] Set `darkMode: "class"` so `dark:` follows `next-themes`, not the OS
- [x] Extend Tailwind colors / radius / shadow / font to CSS variables
- [x] Keep `bg-accent` as the soft tint (do not map it to solid `--accent`)
- [x] Apply Geist on `body`
- [x] Add `--on-accent`, `--overlay`, `--border-extra` in `.dark`
- [x] Add dark-tuned `--success` / `--warning` / `--danger` and `*-soft` variants
- [x] Add semantic utilities (`text-success`, `bg-danger-soft`, `bg-overlay`, …)
- [x] Add `.bg-accent-soft` alias (fixes Users page highlights)
- [x] Point `.btn-primary` / `.bg-accent-solid` at `--on-accent`
- [x] Document tokens in `src/theme/tokens.md`
- [x] Chart tokens `--chart-1` … `--chart-4`
- [x] Motion tokens `--duration-fast` / `--ease-standard`
- [x] Replace styled-jsx scrollbar hide with `.scrollbar-none`

**Done when:** toggling light/dark changes token-driven UI, including `dark:` badges, from the class on `<html>`.

---



## Phase 2 — Shared visual primitives

Goal: delete duplication so later restyle and theming touch few files. Still no new aesthetic.

- [x] `Alert` (error / success / warning / info)
- [x] `StatusBadge` + one status→tone map module
- [x] `Overlay` / `ModalFrame` using `--overlay` and a z-index scale
- [x] Replace remaining Tailwind palette colors (`red-500`, `green-50`, …) with semantic tokens/components
- [x] Shared `StatCard` / `SectionCard`
- [x] Shared `cx` helper
- [x] Route more empty/error states through existing `EmptyState` / `PageError`

**Done when:** `rg "bg-red-50|text-red-500|bg-green-500" src` is empty (or only in theme files).

---



## Phase 3 — Centralized theme controller

Goal: one place owns visual style. Still ship only the current Rooftop light/dark look.

- [x] Theme registry (`id`, `label`, `light` / `dark` token maps); start with `rooftop` only
- [x] `ThemeController` sets `data-palette` and lets `next-themes` keep light/dark/system
- [x] Structure CSS as `[data-palette="rooftop"]` + `.dark`
- [x] Controller API accepts `paletteId` even before a picker exists
- [x] Optional: `useThemeTokens()` / sync `<meta name="theme-color">` from tokens

**Done when:** changing `data-palette` in DevTools is the extension point; pages do not reference palette ids.

---



## Phase 4 — Visual language + app chrome

Gate: agree direction (density, radii, type, brand) before editing pages.

- [x] Record the new look as token values in the `rooftop` registry
- [x] Restyle shell (sidebar, topbar, bottom nav, notifications, command palette)
- [x] Restyle login and accept-invite
- [x] Align logo / wordmark with tokens
- [x] Auth pages follow scheme (toggle or system)
- [x] Optional: icon chrome instead of emoji; menu motion

---



## Phase 5 — Core product surfaces

- [x] Dashboard
- [x] List pages (leads, jobs, tasks, invoices, files, users) + toolbars
- [x] Detail pages + collapsible sections / notes / files / gallery
- [x] Kanban + task calendar + day picker
- [x] Forms

---



## Phase 6 — Reports and data viz

- [x] Reports / product metrics bars use `--chart-*`
- [x] Legend colors are tokens
- [x] Optional: chart library only if CSS bars cannot meet the look

---



## Phase 7 — Public customer surfaces

- [x] Decide portal/estimate light vs inherit salesperson scheme
- [x] Public portal
- [x] Public estimate
- [x] Status badges via shared `StatusBadge`

---



## Phase 8 — PDFs and email

- [x] Print tokens (`accent`, `ink`, `muted`, `rule`, `accentSoft`) from the registry
- [x] Shared PDF theme between estimate and invoice
- [x] Invite email uses registry hex (stay light; no dark mode)

---



## Phase 9 — PWA and brand assets

- [x] Manifest `theme_color` / `background_color` from tokens
- [x] Icons match accent (retire third indigo `#6366f1`)
- [x] Viewport `themeColor` in `layout.js` matches

---



## Phase 10 — User-selectable themes

Depends on Phase 3.

- [x] Palette picker UI
- [x] Persist palette id in `localStorage`
- [x] At least two palettes (`rooftop` + `azure` + `slate`)
- [ ] Optional: persist on `users.theme_palette`

---



## Phase 11 — Optional polish

- [ ] Icon system for activity feed and bottom nav
- [ ] `prefers-reduced-motion`
- [ ] High-contrast palette
- [ ] Toast variants (success/error)
- [ ] Skeleton/shimmer on tokens
- [ ] Keyboard focus audit
- [ ] Print CSS for public estimate