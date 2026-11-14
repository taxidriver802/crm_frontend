# CRM UX audit against the checklist

Date: 2026-11-13. Branch: `experiment/CC_design_rnd`. Standard: [crm-ux-checklist.md](crm-ux-checklist.md) (39 lines, owner decisions included). Background: [crm-ux-expectations.md](crm-ux-expectations.md).

## How this was checked

- **Running app.** A local copy (`audit-api` on :4100 and `audit-web` on :3100, both in `/Users/jasoncox/Desktop/IDE/CRM/.claude/launch.json`) on the QA database (`crm_qa`, company Rooftop Realty: 10 leads, 9 jobs), signed in as the QA owner. Measured with computed styles at 1440 px desktop and 375 px phone. The owner's saved scheme is dark, so most screens were seen in dark.
- **Code.** Shared pieces in `src/components`, styles in `src/app/workbench.css` and `src/app/globals.css`, theme in `src/theme`.
- **Skills.** `design:design-system` (audit) and `design:design-critique`.
- **Not checked:** the field-agent home page, light-scheme rendering of every page, settings / automation / integrations / reports pages in depth, contrast ratios (left to the `ui-color-palette` audit), the public estimate and invoice pages beyond the portal, and form widths on `/jobs/new` and `/estimates/new`.

Status key: **Meets** · **Partial** · **Misses** · **New build** (an owner decision with nothing built yet to align).

## 1. Summary

**Score: 10 Meets, 18 Partial, 8 Misses, 3 New build** (of 39 lines, after the 2026-11-14 checklist amendments; 6 / 21 / 9 / 3 before).

The app is closer to the standard than the research report's "Ours today" column suggested. A design language (`workbench.css`) already sets 14 px body text, 40 px rows with a compact density switch, a 248 px sidebar that collapses to a 60 px icon rail, a right-hand record rail, skeleton loaders and Undo toasts. The gaps cluster in five places:

1. **Status colour.** `pill-info` renders the orange brand accent for "New" and "Appointment Scheduled"; no palette defines `--info`.
2. **Tables.** Rows are clickable `<tr>`s with no row menu, and no list paginates. One shared component (`RecordTable`) serves Jobs, Leads, Tasks and Invoices, so one fix reaches four pages.
3. **Token drift.** CSS uses 22 font sizes and 19 corner radii. Only 29 of 103 radius declarations use a radius token, and panels are 14 px.
4. **Record pages.** History sits behind an "Activity" tab. "Open tasks" sits below the communication log. The address is in the rail, not the header.
5. **Homeowner portal.** Staff theme controls ("Light mode", "Color palettes") show in the customer's header and run past the right edge at 375 px. There is no rep name, schedule or messages section.

Three findings needed the owner's call; they were settled on 2026-11-14 (section 6).

## 2. Corrections to the research report

The report's "Ours today" column was built from `tokens.md`, `tailwind.config.js` and `globals.css`, and missed `workbench.css`. Measured in the running app:

| Item | Report said | Actual | Source |
|---|---|---|---|
| Body text | browser default 16 px | **14 px / 21 px** Geist (`--d-text`) | `workbench.css:27`, `:73` |
| Table cell text | not stated | **13.5 px** | `workbench.css` (13.5 px appears 17 times) |
| Table rows | about 37 px | **40 px**; **32 px** under `html[data-density="compact"]` | `workbench.css:22`, `:44` |
| Density toggle | not built | **Exists** as a density setting (`data-density`); the owner's per-user toggle may already be done. Its UI location was not confirmed | `workbench.css:43` |
| Sidebar | 240 px, collapses to 0 px | **248 px**, collapses to a **60 px** icon rail (`--rail-w-collapsed`). The 0 px rule only hides it before the first paint | `workbench.css:28-29`; `globals.css:1429` |
| Page width | every page in `max-w-6xl` | `.page-wrap` max **1480 px** on lists and record pages | measured |
| Card radius | 10 px | panels **14 px**, board columns 10 px, board cards 8 px; tokens are 6 / 8 / 10 | measured; `workbench.css` |

## 3. Results by checklist line

| # | Checklist line (short) | Status | What the app does | Fix |
|---|---|---|---|---|
| 1 | Left sidebar 248 px, charcoal, no top-bar menu | Meets | Left sidebar, no top menu, 248 px | — (checklist amended to 248 px) |
| 2 | Collapse to a 60 px icon rail, tooltips, persists | Meets | 60 px rail, persists (`data-sidebar`). Tooltips not verified | — (checklist amended to 60 px) |
| 3 | Nav order Home, Jobs, Contacts, Calendar, Tasks, Estimates, Invoices, Reports; account bottom-left; bell top-right | Partial | Today, Jobs, Leads, Tasks, Invoices, Inbox, then "Tools": Files, Reports, Templates, Automation, Integrations, Team. Account menu bottom-left ✓, bell top-right ✓. No Contacts, Calendar or Estimates entry | "Leads" stays; Contacts planned separately ([contacts-plan.md](contacts-plan.md)); Calendar and Estimates entries still missing |
| 4 | "+ New" top of sidebar | Meets | "Create" button at the top with Lead / Job / Task / Appointment; adds "for this job/lead" items in context. Estimate is only contextual | Optional: add Estimate to the global menu |
| 5 | Search matches name, address, phone; ⌘K and "/"; recents | Partial | Sidebar search with ⌘K and recents (`lib/search-recents`). **Address matches; phone does not**: `/api/search?q=555-0147` and `q=6125550147` return nothing | Backend search: match normalised phone digits |
| 6 | Phone: bottom tab bar, no hamburger | Partial | Bottom bar Today / Jobs / + / Leads / Tasks ✓, plus a header "Open menu" hamburger for everything else | Swap Tasks or Leads for "More", or accept the hamburger as "More" |
| 7 | Tables fill `.page-wrap` (max 1480 px) | Meets | `.page-wrap` max 1480 px | — (checklist amended) |
| 8 | Rows 40 / 32 compact / 48 touch; 14 px text; sticky header | Partial | 40 px ✓, compact 32 px ✓, sticky `th` ✓. Cell text **13.5 px** (line says 14). 48 px touch rows not measured | Cells to 14 px (13 px compact): owner decision, code changes in the consistency pass |
| 9 | ≤ 6 default columns incl. rep avatar | Partial | Jobs: Job, Status, Next step, Health, Owner, Owed. Leads: Lead, Status, Phone, Source, Owner, In status. Owner shows as **text**, not an avatar | Initials avatar in the Owner column |
| 10 | Checkbox column, bulk bar "N selected" | Meets | Checkbox column, `.bulk-bar` styles. The automation warning was not verified | — |
| 11 | System views as tabs; filters without saving; empty states | Meets | Stage tabs (All / Selling / Production / Billing / Closed / Lost), "Saved views" + "Save view", search and owner filter apply at once; empty states give one line and an action | — |
| 12 | Numbered pagination, 25/50/100 | **Misses** | No list paginates; all rows render ("7 rows") | Add pagination to `RecordTable` and `DataTable` |
| 13 | Primary cell is `<a>`; no `onClick` on `<tr>`; row kebab | **Misses** | Primary cell is an `<a>` ✓, but rows also click through (`record-table.js:338`, `:398`), and rows have no menu button | Drop the row `onClick`; add a kebab column |
| 14 | Record header: name, address, stage, owner avatar, ≤ 2 buttons, overflow | Partial | Status chip, days in status, client link, owner (text), Pin, Edit, Details, plus a Selling → Production → Billing → Closed progress bar. **Address is in the rail**, not the header | Add the address to the header; owner as avatar |
| 15 | Key fields on the right, sticky; stacks on phone | Meets | `.record-rail` 328 px on the right, sticky from 1180 px (`workbench.css:1586-1615`) on Leads, Jobs, Estimates and Invoices | — |
| 16 | "Up next" above newest-first history | Partial | Overview shows Lifecycle, then the communication log, then **Open tasks**; history is in a separate tab | Put Open tasks first, history under it |
| 17 | Notes, timeline, key fields never behind a tab | **Misses** | Tabs: Overview / Work / Money / Files / **Activity**; full history is only under Activity | Show recent history on Overview; keep Activity only as a change log |
| 18 | Record and settings pages in `.page-wrap` (max 1480 px) | Meets | 1480 px wrapper (main 782 px + rail 328 px at 1440) | — (checklist amended) |
| 19 | Insurance field group on insurance jobs | New build | No insurance fields anywhere | Build per owner decision |
| 20 | Two boards: Leads (sales) and Jobs (production → paid); closed hidden | New build | Leads board exists (New, Contacted, Qualified, Closed, Inactive), and **Closed and Inactive show on the active board**. Jobs has no board. Job lifecycle already starts at **Selling** (New → Proposal Sent), overlapping Leads | Build the Jobs board from Sold with a collapsed Pre-sale column (owner, 2026-11-14); hide closed columns on Leads by default |
| 21 | Board / List / Map toggle on one route, with filters | Partial | Leads: List / Board toggle in the header plus filters ✓. No Map. Jobs: list only | Add Map; add Board to Jobs |
| 22 | Gated drag (Sold needs signed estimate) | **Misses** | Free drag to any status (`kanban-board.js` `handleDragEnd`). Cards carry a visible "Drag" button | Add stage rules per owner decision |
| 23 | Column header: count and plain $ sum | Partial | Count ✓; no $ sum (leads carry no value) | Sum on the Jobs board |
| 24 | Card: name/address, value, rep avatar, next task, days-in-stage | Partial | Name, email · phone, source · date, "2d in status", "Assignee: Unassigned" as text. No value, avatar or next task | Swap email/source for address, value, avatar, next task |
| 25 | Quick-create in modal/drawer with "Create and add another" | **Misses** | Create menu links to full pages (`/leads/new`, `/tasks/new`) | Drawer for lead, contact and task |
| 26 | Job/estimate create: full page, `max-w-2xl`, sticky Save, leave warning | Partial | Full pages ✓. **No leave warning** (`beforeunload` not used anywhere). Width and sticky bar not measured | Add the unsaved-changes guard |
| 27 | Red asterisk; validate on blur | Partial | Shared `Field` renders " *" (`components/ui/field.js:40`). Blur validation only in 8 files | Move blur validation into `Field` |
| 28 | Duplicate warning on create | **Misses** | No duplicate check found | Warn on phone, email, normalised address |
| 29 | Inline edit split by risk, "Saved" + Undo | New build | No inline field editing; edits go through `/…/edit` pages. Undo toasts exist (11 files) | Build per owner decision |
| 30 | Skeletons, button spinners, no loader under 1 s | Meets | Skeletons on lists, the board and the portal (`loadingSkeletons.js`, `.skeleton`) | — |
| 31 | Undo toast for reversible actions; confirm only irreversible | Partial | Undo in 11 files, but `ConfirmModal` on 13 pages. Which confirms guard reversible actions was not reviewed | Review the 13 pages |
| 32 | Text 14 / 13 / 12 px; weight ≥ 400 | Partial | Body 14 / 21 ✓, no weights below 400 ✓. CSS uses **22 distinct font sizes** (13.5 px ×17, 12 px ×13, 0.75 rem ×11, 13 px ×9, 11 px ×8, 12.5 px ×7, 10.5, 11.5, 9.5, 19, 22, 28…), plus 28 arbitrary `text-[…]` classes | Collapse to 12 / 13 / 14 plus a title step |
| 33 | Radius 6 / 8 / 12 by element | **Misses** | Panels 14 px, board columns 10 px, cards 8 px. 19 distinct radius values in CSS (14, 12, 10, 9, 8, 7, 6, 5, 16, 4, 3…); 29 of 103 use a token. Tailwind: `rounded-theme` ×30, `rounded-lg` ×17, `rounded-xl` ×6, `rounded-2xl` ×4 | Set tokens to 6 / 8 / 12; replace literals |
| 34 | Borders; `shadow-sm` at rest; `shadow-md` only when floating | Meets | Hairline borders; resting card 1 px shadow; `--shadow-pop` only on menus, peek, dialogs, toasts | — |
| 35 | Status colours incl. blue info, never the accent | **Misses** | `pill-info` = `#f97316` (the accent) on "New" and "Appointment Scheduled"; `--info` is empty. Green, amber, red and neutral are used correctly, each with a text label | Add `--info` (blue) to all 8 palettes; point `pill-info` at it |
| 36 | Outline icons 16 / 20; initials avatars 24-32 | Partial | Stroke icons ✓ (`components/icons.js`). Avatars only in the account menu; people show as text in tables, cards and record headers | Shared avatar in those places |
| 37 | Phone: 44 px targets; call / text / navigate; upload progress | Partial | On the job page at 375 px with a coarse pointer, **21 controls are under 44 px** (most 28 px: tabs, lifecycle chips). Navigate link ✓; **no call or text** on the job page (only the leads list Phone column has `tel:`). Upload progress not verified | Raise coarse-pointer sizes for tabs and chips; add call and text to the job header |
| 38 | Dark mode on every screen; `/public/*` light | Partial | Per-user scheme ✓; `/public/*` forced light ✓. Full-coverage sweep not done | Sweep in the consistency pass |
| 39 | Homeowner portal: logo, rep, totals, estimates, invoices, photos, schedule, messages | Partial | Per-job portal exists: logo, address, status steps, payments, progress timeline, estimates, invoices (PDF), photos section. **Missing rep name, schedule and messages.** Staff controls "Light mode" and "Color palettes" show in the customer header, and at 375 px end at x = 381 px, past the screen edge | Remove staff controls from public pages; add rep, schedule and messages |

## 4. Design-system audit

**Components reviewed:** 14 shared pieces · **Issues found:** 18 · **Score: 62 / 100** (token coverage is the main drag).

### Token coverage

| Category | Defined | Hard-coded values found |
|---|---|---|
| Colours | Full palette set in `src/theme/themes` (8 palettes, light and dark) | Few: 7 hex in `app/settings/page.js`, 7 in `app/global-error.js` (acceptable: renders without the theme), 2 in `workbench.css`, 1 in `components/return-to.js`. **`--info` missing from every palette** |
| Typography | `--d-text` 14 / 13; Tailwind `text-sm` ×231, `text-xs` ×210 | 22 distinct `font-size` values in CSS; 28 arbitrary `text-[…]` classes |
| Radius | `--radius-sm/md/lg` 6 / 8 / 10 | 74 of 103 non-pill `border-radius` declarations are literals across 19 values; panels at 14 px |
| Spacing | `--d-pad`, `--d-gap`, `--d-section`, Tailwind scale | 101 arbitrary Tailwind values in all (12 `min-h`, 10 `min-w`, 10 `h`, 6 `w`, 6 `max-w`…) |
| Elevation | `--shadow-sm/md`, `--shadow-pop` | In line |

### Component completeness

| Component | Used by | States / variants | Gap |
|---|---|---|---|
| `RecordTable` | Jobs, Leads, Tasks, Invoices | Checkbox, sticky header, density, saved views | Row `onClick`, no row menu, no pagination |
| `DataTable` | Files, Users, Reports / Team | — | A second table component; pagination and row menu need adding in both. Consider one |
| `ListRow` | Portal, public estimate and invoice, Reports, Templates | — | — |
| `Field` | Forms | Label, required asterisk | Blur validation lives in pages, not here |
| `.pill` status badge | Lists, boards, records | success / warning / danger / neutral / **info (wrong colour)** | `--info` |
| `KanbanBoard` / card / column | Leads only | Drag with a keyboard "Drag" button | No rules per stage, no value or next task, closed columns always shown |
| Record layout (tabs, rail) | 4 record pages | Tabs with counts, sticky rail | History behind a tab |
| `ConfirmModal` | 13 pages | — | Usage needs review against the Undo rule |
| Toast | 11 files use Undo | Undo ✓ | — |
| Skeletons | Lists, board, portal | ✓ | — |
| Command palette | Shell | ⌘K, recents | Phone search (backend) |
| `PublicFrame` | Public pages | Forced light, company logo | Shows staff theme controls |
| Avatar | Account menu only | Initials | Not used for owners and assignees |
| Map, inline edit, duplicate check, quick-create drawer | — | — | Not built |

### Naming

| Issue | Where | Recommendation |
|---|---|---|
| Two table components with overlapping jobs | `ui/record-table.js`, `ui/data-table.js` | Keep one name and one set of row behaviours |
| "Leads" doubles as the customer list | Nav, record rail "Client → Open lead" | Owner call (section 6) |
| Home is "Today" in the nav, `/dashboard` in the URL, "Home" in the checklist | Shell | Pick one word; the checklist can follow the app ("Today") |

## 5. Design critique: key screens

**Overall impression.** The app reads as a calm, dense working tool, closer to the 2026 sales-CRM look than to the roofing incumbents. The orange accent is used well for the primary action. The biggest opportunity is to make status and people scannable: blue for "new / scheduled", avatars for owners, and history on the first view of a record.

### Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Customer portal shows staff theme controls, and they run off-screen on a phone | 🔴 Critical | Hide theme and palette controls on `/public/*` |
| "New" and "Appointment Scheduled" are the same orange as the primary button | 🔴 Critical | Blue `--info` |
| Phone numbers can't be found through search | 🟡 Moderate | Match digits in the backend |
| Record history is one tab away; Open tasks sit below the log form | 🟡 Moderate | Open tasks, then recent history, on Overview |
| Lead board shows Closed and Inactive columns in the working view | 🟡 Moderate | Hide them by default |
| No call or text buttons on the job page on a phone | 🟡 Moderate | Add to the record header |
| Rows open on any click, with no row menu | 🟢 Minor | Link the name cell; add a kebab |
| The shell briefly shows "Workspace" and "You" before the company loads | 🟢 Minor | Hold the shell skeleton until the session resolves |

### Visual hierarchy

- **What draws the eye first:** the orange "Create" button and the orange primary action on each page. That is correct, but orange "New" status dots compete with it.
- **Reading flow:** sidebar, then title and filters, then the table. On the job page the lifecycle bar and Lifecycle panel come before what to do next.
- **Emphasis:** page titles are 16 px / 650. They are quiet next to 13.5 px table text and rely on position more than size.

### Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Radius | 14 px panels, 10 px columns, 8 px cards, 9 / 7 / 5 px controls | Tokens 6 / 8 / 12 |
| Type | 13.5 px cells, 12.5 / 11.5 / 10.5 px labels | 12 / 13 / 14 |
| People | Owner as text in tables, "Assignee: …" on cards, avatar only in the account menu | One avatar piece |
| Tables | `RecordTable` and `DataTable` behave differently | One row behaviour |

### Accessibility

- **Colour contrast:** not measured here; the `ui-color-palette` audit is next.
- **Touch targets:** 21 controls under 44 px on the phone job page (tabs and lifecycle chips at 28 px).
- **Text readability:** 14 px body with 21 px line height is good; 10.5 px and 9.5 px sizes in CSS are below a comfortable floor.

### What works well

- A real design language: density variables, borders before shadows, tabular numbers for money and dates.
- Right-hand sticky record rail used the same way on all four record pages.
- Skeleton loaders everywhere, and Undo toasts already in use.
- Phone bottom bar with a centred Create button.
- A per-job customer portal with progress, payments and documents already exists.

## 6. Owner calls raised by the audit (settled 2026-11-14)

1. **Jobs vs Leads overlap → the Jobs board starts at Sold**, with a collapsed Pre-sale column first for jobs still in a selling stage. Selling work stays on the Leads board.
2. **Contacts → keep "Leads"** in the nav. Contacts is planned separately in [contacts-plan.md](contacts-plan.md).
3. **Measured values → the checklist takes 248 / 60 px and 1480 px; the code moves table cells from 13.5 px to 14 px.**

## 7. Suggested order of work

1. Blue `--info` on all palettes (one token, every status chip). Runs in the `ui-color-palette` step.
2. Public pages: remove staff controls; add rep name.
3. `RecordTable`: drop row `onClick`, add a kebab and pagination (four pages at once); then `DataTable`.
4. Radius and type tokens (6 / 8 / 12; 12 / 13 / 14), replacing literals in `workbench.css`.
5. Record pages: Open tasks then recent history on Overview; address and call / text in the header; owner avatar.
6. Boards: hide closed columns; card contents; stage rules.
7. New builds after the owner calls: Jobs board, Map, inline edit, insurance fields, quick-create drawer, duplicate warning, portal schedule and messages.
