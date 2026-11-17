# Design language (the Workbench)

How Joist looks and how its pages are put together. Token values live in
[`src/theme/tokens.md`](../src/theme/tokens.md); the brand in
[`src/theme/brand.md`](../src/theme/brand.md); component APIs and the
"Adding a page" steps in the [README](../README.md#shared-ui-the-workbench).
The decision log behind this language is
`crm_backend/docs/EXPERIMENT_UI_UX.md`. What it replaced:
[`design-history.md`](design-history.md).

## Thesis

One persistent workspace the person shapes. Records open beside the list
(peek), nothing makes you lose your place, and the next step is always in
view. It is a working tool for roofing and exterior contractors: dense,
calm, familiar. Brand shows in details, not decoration.

## Visual principles ("Field Ledger", `src/app/workbench.css`)

- **Paper and ink.** Warm neutral canvas, white working surfaces, hairline
  borders. Shadow only on things that float: menus, the peek panel, dialogs,
  toasts (`--shadow-pop`).
- **One accent, used sparingly:** the primary action, focus, selection and
  the current lifecycle step. Never decoration, never urgency.
- **Status colour only where it means something.** Urgent or late is
  `--danger`; money owed is `--warning` (gold); done is `--success`.
  Informational counts stay `--text` / `--text-muted`, untinted.
- **Density is a setting.** Rows, controls, padding and gaps read from
  `--d-*` variables; `html[data-density="compact"]` switches them (40px
  rows by default, 32px compact). New components read these variables.
- **Numbers line up.** Money, dates and counts use tabular figures (`.num`).
- **One family.** Geist for everything; Geist Mono only for code-like data.
- **Short motion that shows state.** Panels and menus transition in about
  100–180ms. The Reduce motion preference (`html[data-motion="reduce"]`)
  and `prefers-reduced-motion` turn it off.
- **Every palette, both schemes.** Pages use tokens and Tailwind token
  utilities only. No raw Tailwind colours (`red-500`) and no branching on
  palette ids.

## Shells

Three shells. Do not mix them.

| Shell | Pages | Rules |
| --- | --- | --- |
| App (`AppShell`) | Every signed-in page | Persistent rail (collapses to icons), top bar with search and Create, phone tab bar. `AppShell` `title` is the page's only `h1`. |
| Auth (`AuthFrame`) | login, register, accept-invite, forgot-password, reset-password | Centred card; the frame title is the only `h1`. Company brand once a slug is known, Joist before that. |
| Public (`PublicFrame`) | `/public/portal`, `intake`, `estimate`, `invoice` | Company header, one muted "Powered by Joist" line. Always light scheme, company palette. Stacked, always-open sections. |

## Page types

### Today (`/dashboard`)

Greeting plus the date, then widgets the person chooses and orders (Needs
you, Agenda, Pinned, Money, Pipeline, Handoffs, Team, Activity). Owners and
admins can make their layout the team default.

### Work lists: Leads, Jobs, Tasks, Invoices

- Header: entity name plus a live subtitle (`9 in this view`).
- Scope (Mine / All) and layout toggles sit in AppShell `right`; they wrap
  below the title on small screens. Leads has List / Board; Tasks has
  List / Calendar.
- Status tabs with live counts (`Segmented`) are the main filter. Jobs
  also filter by phase.
- One `PageToolbar` row for search, assignee, refresh and New, wrapping on
  small screens. Saved views sit on a thin row below it.
- `RecordTable`: the person picks columns, order and sort. Row click opens
  the peek; ⌘-click opens a tab; `x` selects; a bulk bar acts on the
  selection. Phones get cards.
- Filters, tab and peek live in the URL (`?status=`, `?view=`,
  `?peek=job:12`), so reload, Back and shared links land in the same place.
- **Urgency metrics only on Tasks** (`AttentionStrip`: Overdue, Due today,
  Next 7 days). A metric filters the list in place. Overdue gets the
  `--danger` border only when its count is above zero. Leads and Jobs are
  sliced by stage, not urgency, so they get no metric strip; job health is a
  row badge.

### Records: Job, Lead, Estimate, Invoice

- Record head: status, related records, the big number, Pin, More, and the
  **next step** with the button that does it. Job, estimate and invoice
  compute their next step the same way in the record, its peek and the job.
- Body is `Tabs` (URL-synced with `?tab=`). Job: Overview · Work · Money ·
  Files · Activity. Lead: Overview · Jobs · Work · Files.
- An optional details rail beside the tabs; the person can reorder or hide
  Overview sections and rail panels.
- `RecordUnavailable` when the record cannot be shown.
- The Task record is older: `DetailHeader` (subtitle, badges, actions; no
  second title) and stacked sections.

### Forms

One full form per type at `/<type>/new` (lead, job, task, estimate,
invoice), reached from Create or the list's New button and prefilled from
query params (`?job_id=`). Edit routes exist for lead, job, task and
estimate; invoice line items are edited on the invoice. Lists carry no
inline create form. AppShell is the only `h1`; the body is one card of
`Field` / `FormActions`.

Estimates have no index page: they live on their job, and sent ones
surface on Today.

### Tool panels: Files, Users, Templates, Automation, Reports, Integrations

Same chrome (live subtitle, `PageToolbar`, `Segmented` when status is a
real slice) but **no urgency metrics**. Files, Users and the team report
use `DataTable` (labelled cards below `md`), because their rows are tools,
not records you open and work. Owner and admin areas wrap their content in
`AdminOnly`. Reports keep their KPI cards (`StatCard`) and charts.

## Interaction rules

- **Undo over confirm.** Reversible actions show a toast with Undo. Confirm
  only what cannot be undone, and anything sent to a homeowner. (Owner
  decision; the full list of where it applies is in
  [`research/crm-ux-checklist.md`](research/crm-ux-checklist.md).)
- **Common actions sit on the row** (complete a task, change status).
- **Peek before navigate.** Opening a record beside the list is the
  default; full pages are for deep work.
- **Search and commands:** ⌘K or `/` opens the palette. It searches records,
  remembers recent ones, takes filter tokens (`lead:`, `job:`, `status:`,
  `assigned:me`, `jump:` on a record), runs actions after a `>` prefix,
  and offers "Create … named" when nothing matches. Filter grammar:
  `src/lib/search-filters.js`.
- **Keyboard:** `c` Create, `g` then a letter to go somewhere, `[`
  collapses the rail, `?` lists shortcuts. Menus take arrows, Home, End and
  Esc.

## Copy

Sentence case. Titles state the current context, not navigation history.
Buttons name their action ("Schedule appointment", "Send password reset
link"). Copy says what is true; errors say what happened and what to do.
