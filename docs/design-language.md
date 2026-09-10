# CRM design language

Single reference for page structure across the product. Tokens live in [`src/theme/tokens.md`](../src/theme/tokens.md). This file is the layout and behavior language; it does not introduce new colors.

Teardown that produced these decisions: [`crm-design-language.md`](crm-design-language.md) (archive, not the spec).

Dashboard, Leads, Jobs, Tasks, and Invoices are the reference list pages. Job is the detail template. Other records copy that template. Full new/edit forms use AppShell plus a Field card. Files and Users share that list chrome as **tool panels**, not work queues.

---

## Page header

- Title states the current context: Dashboard uses a greeting plus the calendar date. List pages use the entity name plus a live subtitle (`9 in this view`).
- Never use leftover labels (“Previous layout”).
- Mine/Team and List/Board (or List/Calendar on Tasks) live in AppShell `right` (desktop topbar). Below `lg` they drop into `page-actions` under the title. The cluster must wrap; do not rely on a single unwrapping row.
- Greeting + date is **Dashboard only**.

## Detail title

**AppShell is the only page title.** Pass the record name (or invoice number) as `AppShell` `title`. The chrome already has back navigation and that title.

Job is the **detail template**. AppShell is the only `h1`. The record summary is `DetailHeader` **without** a title/heading — subtitle (linked lead), badges (status, health, time in status), and actions (Edit + More). Optional description and address sit in that card, not as a second title.

Lead, Task, Invoice, and Estimate copy this Job pattern. `DetailHeader` keeps subtitle, badges, and actions only.

`description` on details is optional context (email, related job), not a second title.

## Metrics

- Use **3–4 urgency/action metrics** when the page’s primary slice is *when or whether it needs you now*. Dashboard: Overdue, Due today, Waiting, Invoices. **Tasks:** Overdue, Due today, Next 7 days (existing counts). Clicking a metric **filters the page list**; click again returns to All. Do not use `StatCard` `href` to bounce to a query string if the same list can filter in place.
- Overdue uses `--danger` (border and counts) only when the count is greater than zero.
- Brand `--accent` is for primary buttons, selected nav, and selected chips — not urgency.
- **Pipeline list pages** (Leads, Jobs) do **not** get an urgency strip. Their primary slice is stage; status tabs with live counts are the filter. Job health stays a row badge (see below).
- **Secondary inventory** (Dashboard only): Jobs, Estimates, Total leads, New leads, Next 7 days — hidden by default, “More counts”, those cards **navigate**. They do not filter Do next.

Tasks differ from Leads/Jobs because a task’s job is a due date, not a pipeline stage. Status (Open / Completed) may still be tabs under the metrics; Calendar lives in AppShell `right`, like List/Board on Leads.

## Primary lists

- One unified, filterable list per work page. Tabs with live counts. If two sections list the same kind of work, merge them.
- Dashboard Do next tabs: All / Overdue / Today / Waiting / Invoices / Pipeline. Tabs wrap (existing `.seg`); use `short` labels on small screens. No horizontal scroll trap.
- Common actions (complete a follow-up) sit **inline on the row**.

### EntityList vs DataTable

- **`EntityList` `layout="flush"`** when the row’s job is *open this record and work it* (Leads, Jobs, Tasks, Invoices).
- **`DataTable`** when there is no dedicated record route, or the row is an admin/tool grid: many comparable columns, row-level admin actions, preview/download rather than a detail page. **Files** and **Users** stay DataTable (`DataTable` already stacks to labeled cards below `md`).
- Threshold is the interaction, not column count: if you would build `/files/[id]` or `/users/[id]` as a work record, it would be EntityList. Today those are tools, not records.

Estimates stay **nested on the Job**. Do not add `/estimates` as a work list. Sent/waiting estimates already surface on Dashboard Do next; creating an estimate starts from the job.

## Creation

- **Complete-on-the-list entities** (lead, job, task): one primary button; inline form only when opened; full-page form remains a secondary link. No always-visible create card.
- **Document entities** (invoice, estimate): create is the start of a record (line items live on the detail). The list (or Job) primary button **navigates** to `/invoices/new` or `/estimates/new`. Do not inline a draft form that dumps the user back on the index with an incomplete document. After create, go to the new record.

## Toolbars

- Search, assignee (when the entity is assigned), refresh, and the primary create button share **one row** and wrap on small screens.
- Saved views sit on a **thin row below**, not beside status tabs.
- That wrap row is the shared **`PageToolbar`** primitive. Do not add extra props until Invoices needs them.

## Right rail (dashboard-style pages)

- Orientation, not a second work queue.
- Compact **count rows** for Waiting and Invoices: they set the **same filter** as the matching metric/tab.
- Team (admins) and Activity stay short.
- Inventory totals do **not** live in the rail; they live in the secondary metrics toggle.

## Job health

Health (`Needs attention` / `Watch` / `On track`) is a **row badge only**. It is derived from overdue tasks, overdue invoices, and stall — those already have filters on Dashboard and Tasks. Do not add a Needs-attention filter on the Jobs list.

## Detail sections

Record bodies use **always-open stacked sections** (`SectionCard` or equivalent), not accordions, for work blocks (tasks, estimates, invoices, notes, files, pipeline).

Collapse is allowed only for **log-like** blocks (Activity) or a section that is empty *and* optional (e.g. measurements with nothing recorded). Do not hide primary work behind a disclosure.

When Job is restyled, Estimates / Invoices / Tasks on that page stay visible without a click.

**Job template (Wave 2):** stacked `SectionCard`s for pipeline, tasks, estimates, invoices, communication, and files. Collapse only **Activity** and **Measurements** when that optional section is empty. No second column / lead snapshot rail — lead lives in the summary subtitle.

**Other records (Wave 3):** Lead, Task, Invoice, and Estimate copy Job. No second heading. Always-open work sections. Collapse only Invoice **Timeline**. Related entities live in the summary subtitle, not a snapshot rail. Document line items are a visible `SectionCard` with New item revealing the form.

## Form pages

Full new/edit routes are secondary to the list and the record. **AppShell is the only h1.** Body is one card of `Field` / `FormActions`. Do not add `DetailHeader`, metrics, or work sections.

- **New:** `New lead`, `New job`, `New task`, `New invoice`, `New estimate`.
- **Edit:** `Edit lead`, `Edit job`, `Edit task`, `Edit estimate`. There is no invoice edit route; line items stay on the invoice record.
- `description` is the related or current record name when known (a prefilled job, the lead being edited). Do not put `#id` in the title, and do not change the title as the user picks a dropdown.
- Inline create on Leads / Jobs / Tasks stays on the list. The full page stays the **Full form** link.

## Tool panels

Files, Users, Templates, Automation, Reports, and Integrations are **tools**, not work lists. They reuse AppShell, a live subtitle, `PageToolbar`, and `Segmented` when status is a real primary slice. They do **not** get urgency StatCards.

Wave 5 stays one signed bucket. Sequence internally: **Files + Users**, then Templates + Automation, then Reports + Integrations. Do not add a Wave 5b as a new signed wave.

- Inventory counts (total files, general vs lead vs job) are **not** an urgency strip. Scope already lives in a filter.
- **Files:** `title="Files"`, `description` = `N in this view`. `PageToolbar`: search, scope, type, refresh, **Upload file**. Keep `DataTable`. Do not wrap the table in `CollapsibleSection`.
- **Users:** Status is a primary slice — `Segmented` All / Active / Invited / Disabled with counts. `PageToolbar`: search, role, refresh, **Invite user**. Keep `DataTable`. Invite stays a modal. Keep the admin note about owner accounts.
- **Templates:** `title="Templates"`, `description` = `N in this view`. `PageToolbar`: refresh, **New template**. Inline create card (no `ToggleFormSection`, no full-form route). Line items copy Invoice: always-open `SectionCard` with **New item** revealing the form.
- **Automation:** `title="Automation"`, `description` = `N in this view`. `PageToolbar` refresh. Stacked always-open `SectionCard`s for Active rules and Rule templates. Do not wrap them in `CollapsibleSection`.
- **Reports:** Not a work queue. KPIs and charts stay; they are the page. `PageToolbar` refresh. Product metrics lives in AppShell `right` (secondary destination). Sentence case titles.
- **Integrations:** `title="Integrations"` plus a short subtitle. Website intake is a `SectionCard`. ABC / QuickBooks are destination cards, not a second heading. Nested pages use AppShell as the only `h1` (no extra back link).

## Auth and public

Login, accept-invite, and public pages use **different shells**. Do not put AppShell, nav, or PageToolbar on them. Reuse tokens, `Field`, `FormActions`, `SectionCard`, and `ListRow`.

- **Auth (`AuthFrame`):** centered card. The frame title is the only `h1` (`Sign in`, `Accept invite`). Body is `Field` / `FormActions`. Theme toggle stays in the corner.
- **Public (`PublicFrame`):** logo + `h1` + optional muted eyebrow/description. No uppercase tracking labels. Stacked always-open `SectionCard`s. Theme toggle in the header.
- **Intake:** one Field card. **Portal:** job title is the `h1`; status, progress, estimates, invoices, photos stay visible. **Estimate:** summary, line items, and respond — line items use `ListRow`.
- Invite create stays a modal in the app (`Invite user`). The public accept page is `/accept-invite`.

## Color

| Use | Token |
| --- | --- |
| Overdue / needs-you-now | `--danger` |
| Pipeline status chips | `--warning` / `StatusBadge` tones |
| Primary CTA, selected nav, selected chips | `--accent` |
| Informational counts | `--text` / `--text-muted` — no tint |

## Primitives

Reuse these; do not invent a parallel set:

- Header: AppShell `title` / `description` / `right`; auth `AuthFrame`; public `PublicFrame`
- Record summary: `DetailHeader` without a duplicate `h1` (subtitle, badges, actions)
- Metrics: `AttentionStrip` + `StatCard` (`metric` primary, `compact` inventory)
- Count tabs: `Segmented` with `count` / `countTone`
- Lists: `EntityList` `layout="flush"` on work-first index pages; `DataTable` for Files/Users
- Toolbar: `PageToolbar`
- Urgency: `border-danger`, `text-danger`, `seg-count-danger`

Spacing, radius, and card padding stay the existing theme tokens unless a wrap bug appears.
