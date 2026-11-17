# Design history

What the current [design language](design-language.md) replaced, kept short
so nobody builds from a superseded rule. The full documents are in git
history: `docs/VISUAL_OVERHAUL.md`, `docs/crm-design-language.md`, the
pre-Workbench `docs/design-language.md`, `docs/command-palette-expansion.md`,
`docs/structure.md` and `docs/projecttree.md` (removed 2026-11-17).

## 1. Visual overhaul (September 2026)

A phased roadmap (`VISUAL_OVERHAUL.md`) that gave the app one token
vocabulary before any restyle: CSS variables mapped into Tailwind, shared
primitives (`Alert`, `StatusBadge`, `Overlay`, `StatCard`, `SectionCard`),
no raw Tailwind palette colours, a palette registry with `data-palette`,
a palette picker, `--chart-*` tokens, light-only customer pages, print
tokens for PDFs and email, and PWA colours from tokens.

Discoveries that still hold:

- `bg-accent` was already used as the soft tint, so it stayed the soft tint;
  solid accent is `bg-accent-solid`.
- Ember's `--warning` is gold because orange warning collided with the
  orange accent.
- Customer pages force light so a salesperson's dark theme cannot leak onto
  a link they preview.

Polish items that were still open when it closed, and where they stand now:
reduced motion, toast tones, a drawn icon set, shimmer skeletons on tokens
and a server-saved palette all exist. **Still open:** a high-contrast
palette, a keyboard focus audit, print CSS for the public estimate.

## 2. Pre-Workbench page language (September 2026)

A teardown of a "classic" and a "new" Dashboard and Leads
(`crm-design-language.md`) produced page rules (`design-language.md`, first
version). These carried into the Workbench unchanged:

- Accent is for actions and selection, never urgency; red only when an
  overdue count is above zero; informational counts are untinted.
- Live subtitles (`9 in this view`) instead of leftover labels.
- Status tabs with counts as the main filter; one toolbar row; saved views
  on a thin row below.
- Tool panels get no urgency metrics; Files and Users stay `DataTable`.
- AppShell is the only `h1`; three shells; estimates live on their job.

These were replaced:

| Then | Now |
| --- | --- |
| Dashboard: greeting, a unified "Do next" list with tabs, four urgency metrics, a right rail, "More counts" | Today: widgets each person chooses and orders. The urgency strip lives on Tasks only |
| `EntityList layout="flush"` for work lists | `RecordTable` with chosen columns, sort, bulk bar and peek |
| Inline create forms on Leads, Jobs and Tasks | One full form per type at `/<type>/new`; no inline create |
| Records as always-open stacked sections under `DetailHeader`, no tabs | Record head with the next step, `Tabs`, an optional details rail. The Task record still uses the old pattern |
| Dark charcoal sidebar on `--chrome` tokens | Light rail on `--rail-bg`; the chrome tokens are unused |
| Cool grey neutrals (`#f4f5f7`, `#111318`) | Warm paper and ink (`#f6f5f1`, `#1b1a17`). Print maps still carry the cool greys |

## 3. The Workbench (November 2026)

`experiment/CC_ui_reimagination` replaced the page structure with one
persistent workspace: peek, the next step, preferences that follow the
person, density as a setting, and the "Field Ledger" visual language. Its
decision log is `crm_backend/docs/EXPERIMENT_UI_UX.md`; later passes
(`CC_revise`, `CC_help`, `CC_brand`) have pointer files at the repo root
(`EXPERIMENT_*.md`). The brand pass renamed the Rooftop palette to Ember
(id unchanged) and made Joist the product brand.

The command palette expansion (recents, `>` actions, aliases,
create-from-query, filter tokens, `jump:` on records) shipped in full
before the Workbench and carried over. Its behaviour is summarised in the
design language.
