# Experiment: Workbench UI (`experiment/CC_ui_reimagination`)

Branch cut from `experiment/CC_expansion`. The full decision log (research,
assessment, thesis, design system, architecture, tradeoffs, verification) is
in `crm_backend/docs/EXPERIMENT_UI_UX.md`.

## The idea

One persistent workspace you shape yourself. Records open beside the list
you came from (peek), the next step is always in view, and everything about
your layout follows you to every device.

## Where things are

| Area | Files |
|---|---|
| Shell (rail, topbar, tab bar, sheet, Create, inbox, account menu, shortcuts) | `src/components/app-shell.js`, `src/components/shell/*` |
| Preferences state (server-backed, optimistic) | `src/components/workspace/workspace-provider.js`, `src/lib/preferences.js` |
| Peek panel (`?peek=kind:id`) | `src/components/peek/*` |
| Record layout (head, tabs, rail, arrange) | `src/components/records/*`, `src/app/jobs/[id]/page.js`, `src/app/leads/[id]/page.js` |
| One table for every list | `src/components/ui/record-table.js`, `src/components/lists/columns.js` |
| Today | `src/app/dashboard/page.js`, `src/components/today/*` |
| Preferences page | `src/app/settings/page.js` |
| Design system ("Field Ledger") | `src/app/workbench.css`, `src/theme/themes/rooftop.js` |

## Shortcuts

`⌘K` or `/` search · `c` create · `g` then `h` `j` `l` `t` `i` `n` `r` `s`
(Today, Jobs, Leads, Tasks, Invoices, Inbox, Reports, Preferences) ·
`[` collapse the sidebar · `?` help. On lists: arrows, `Enter` to peek,
`x` to select.

## What you can customise

Theme, palette, density, reduced motion · sidebar order, hidden items,
collapsed state, pins · Today widgets, columns and order · list columns,
order and sort · record Overview sections and the details rail. Owners and
admins can make their setup the team default. Stored by the backend at
`/me/preferences` and `/company/workspace-defaults`.

## Checks

```bash
npm run lint
```

Touched files lint clean. The remaining findings (one error in
`theme-controller.js`, three warnings) are in files unchanged from the parent
branch.
