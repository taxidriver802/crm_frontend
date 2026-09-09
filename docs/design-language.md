# CRM design language

Single reference for page structure across the product. Tokens live in [`src/theme/tokens.md`](../src/theme/tokens.md). This file is the layout and behavior language; it does not introduce new colors.

Teardown that produced these decisions: [`crm-design-language.md`](crm-design-language.md) (archive, not the spec).

**This pass:** Dashboard and Leads. Other pages follow these rules when they are restyled later. Comparison routes (`/dashboard/classic`, `/leads/classic`) stay until sign-off.

---

## Page header

- Title states the current context: Dashboard uses a greeting plus the calendar date. List pages use the entity name plus a live subtitle (`9 in this view`).
- Never use leftover labels (“Previous layout”).
- Mine/Team and List/Board live in AppShell `right` (desktop topbar). Below `lg` they drop into `page-actions` under the title. The cluster must wrap; do not rely on a single unwrapping row.
- Greeting + date is **Dashboard only**.

## Metrics

- Lead with **3–4 urgency/action metrics**. Dashboard primary: Overdue, Due today, Waiting, Invoices.
- Clicking a primary metric **filters the page’s unified list**. Clicking the active metric again returns to All.
- Overdue uses `--danger` (border and counts) only when the count is greater than zero.
- Brand `--accent` (orange on Rooftop) is for primary buttons, selected nav, and selected chips — not urgency.
- **Secondary inventory** (Jobs, Estimates, Total leads, New leads, Next 7 days) is **hidden by default**, revealed by a “More counts” control under the primary row. Those cards **navigate** to the matching list. They do not filter Do next.

## Primary lists

- One unified, filterable list per work page. Tabs with live counts. If two sections list the same kind of work, merge them.
- Dashboard Do next tabs: All / Overdue / Today / Waiting / Invoices / Pipeline. Tabs wrap (existing `.seg`); use `short` labels on small screens. No horizontal scroll trap.
- Common actions (complete a follow-up) sit **inline on the row**.

## Creation

- One primary button (`New lead`). The create form appears only when that button is used. A full-page form remains a secondary link.
- Do not keep a full-width create card on the page when the form is closed.

## Toolbars

- Search, assignee, refresh, and the primary create button share **one row** and wrap on small screens.
- Saved views sit on a **thin row below**, not beside status tabs.

## Right rail (dashboard-style pages)

- Orientation, not a second work queue.
- Compact **count rows** for Waiting and Invoices: they set the **same filter** as the matching metric/tab.
- Team (admins) and Activity stay short.
- Inventory totals do **not** live in the rail; they live in the secondary metrics toggle.

## Color

| Use | Token |
| --- | --- |
| Overdue / needs-you-now | `--danger` |
| Pipeline status chips | `--warning` / `StatusBadge` tones |
| Primary CTA, selected nav, selected chips | `--accent` |
| Informational counts | `--text` / `--text-muted` — no tint |

## Primitives

Reuse these; do not invent a parallel set:

- Header: AppShell `title` / `description` / `right`
- Metrics: `AttentionStrip` + `StatCard` (`metric` primary, `compact` inventory)
- Count tabs: `Segmented` with `count` / `countTone`
- Lists: `EntityList` `layout="flush"` on work-first index pages
- Urgency: `border-danger`, `text-danger`, `seg-count-danger`

Spacing, radius, and card padding stay the existing theme tokens unless a wrap bug appears.
