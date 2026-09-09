# CRM Design Language — Dashboard & Leads Teardown

Archive. Locked decisions live in [`design-language.md`](design-language.md).

Goal: pull the best of "classic" and "new" into one hybrid direction, then generalize it into rules that apply to every future page.

---

## 1. Dashboard

### Keep from Classic
- **7-stat overview row** actually carries useful info at a glance (Jobs, Estimates, Overdue, Due Today, Next 7 Days, Total Leads, New Leads). New trims this to 4, which is cleaner but loses Jobs/Estimates/Total Leads/Next 7 Days visibility on the main screen.
- **"Estimates awaiting" and "Invoices due" as separate right-rail cards.** Splitting these out keeps each category scannable instead of folding everything into one feed.

### Keep from New
- **Personalized header** ("Good morning, Jason" + date) beats a generic "Dashboard / Previous layout" label — it's warmer and confirms the date at a glance, which matters for a follow-up-heavy tool.
- **Unified "Do next" list with filter tabs** (All / Overdue / Today / Waiting / Invoices / Pipeline) is the single biggest win. Classic scatters the same information across "Start here," "Estimates awaiting," and "Invoices due" with no way to filter; New puts it in one place and lets you slice it. This is the pattern to standardize on.
- **Inline "Done" action per row** — closing a task without opening it is a real efficiency gain classic doesn't offer.
- **Red-bordered "Overdue" card + red overdue counts in the Team list** — urgency is communicated through a targeted accent color, not blanket contrast. Fits your "intentional over high-contrast" instinct: red is reserved for the thing that actually needs it.
- **Snapshot + Team + Activity in the right rail** gives a compact status-of-the-business view that classic doesn't have at all.

### Fix in either
- Classic's stat row (7 cards) and New's (4 cards) both have a place — the fix isn't picking one, it's tiering them (see §3).
- New's "Do next" tabs are good but at 6 tabs (`All/Overdue/Today/Waiting/Invoices/Pipeline`) they're close to crowding on smaller viewports — worth confirming they wrap or collapse gracefully.

### Recommended hybrid
Personalized header + New's "Do next" unified/filterable list as the primary content block + a trimmed stat row that keeps New's 4 urgency-first metrics up top but makes Jobs/Estimates/Total Leads/New Leads available as a secondary row or toggle rather than dropping them. Right rail: Snapshot, Team, Estimates awaiting, Invoices due, Activity — News's rail plus Classic's two finance-facing cards.

---

## 2. Leads

### Keep from Classic
- Nothing structurally — every change New makes here is a net improvement. The one thing worth preserving is the **explicit "Create Lead" affordance's clarity** (it's very obvious what it does), but it shouldn't cost a full-width card to achieve that.

### Keep from New
- **Status tabs with counts** (`All 9 / New 5 / Contacted 1 / Qualified 1 / Closed 1 / Inactive 1`) replace a generic Status dropdown. This is strictly better — same filtering power, faster to scan, shows distribution without opening anything.
- **Collapsing "Create Lead" into a single primary "New lead" button** reclaims a full card's worth of vertical space that Classic spends on a form users open constantly, not once.
- **One consolidated toolbar row** (search + assignee dropdown + refresh + New lead) vs. Classic's two stacked rows (search/status/assigned-to, then My Leads/Team/List/Board/Saved views). New still keeps Saved views, just demoted to its own thin row instead of competing with primary filters.
- **"X in this view" header subtitle** instead of "Previous layout" — states something useful about the current state of the page rather than a leftover layout label.

### Fix in either
- New drops the My Leads/Team and List/Board toggles from what's visible in the crop — confirm those persist somewhere (they're valuable, just shouldn't cost their own row). If they got merged into the tab bar or moved to the header, that's the right call; if they were cut, add them back as a compact icon-toggle group in the header.

### Recommended hybrid
New's structure almost wholesale: status tabs w/ counts, single toolbar row, "New lead" as the only creation entry point, Saved views on its own thin row. Just confirm List/Board and Mine/Team survive as compact controls near the header.

---

## 3. Project-Wide Design Language

Patterns to standardize across every page, based on what's demonstrably working in "New":

| Pattern | Rule |
|---|---|
| **Page header** | Contextual subtitle over generic labels. State what's true right now ("9 in this view", "Wednesday, September 9") instead of navigation history ("Previous layout"). |
| **Metrics row** | Lead with 3–4 urgency/action metrics, not a full inventory of every count. Secondary counts move to a rail or a second-tier row — don't let the top of the page become a stat wall. |
| **Primary lists** | One unified, filterable list per page (tabs with live counts) beats several parallel single-purpose lists. If a page has 2+ list-like sections doing similar jobs (Classic's Start here / Estimates awaiting / Invoices due), that's a signal to merge them into one filterable list. |
| **Row-level actions** | Where an action is common (closing a task, updating status), put a compact action inline in the row instead of requiring a click-through. |
| **Creation entry points** | One primary button (e.g. "New lead"), not a full-width dedicated card. Full-width creation forms only justify their space if they're the main reason someone's on the page. |
| **Toolbars** | Filters, search, and view toggles live in as few rows as possible. Saved/secondary controls (Saved views) can sit on their own thin row below the primary toolbar rather than competing with it. |
| **Color for urgency** | Reserve accent color (red border, red counts) for genuinely urgent states — overdue items, items needing attention now. Don't tint things that are just "informational." |
| **Right rail (dashboard-style pages)** | Compact, glanceable cards: Snapshot metrics, Team/people status, recent Activity. Keep each card short — this rail is for orientation, not deep detail. |
| **Personalization** | Greeting + date in the primary header on high-traffic pages (Dashboard) reinforces "this is live, current-state info," not a static screen. |

---

## 4. Open questions for you
- On Dashboard, do you want the secondary stat row (Jobs/Estimates/Total Leads/New Leads) always visible, or collapsed behind a toggle/expand?
- On Leads, confirm whether List/Board and Mine/Team should live in the page header (top-right) or as a compact control near the toolbar.
- Want me to turn §3 into a literal component spec (spacing, tab styles, card padding) once you've got base tokens (colors, type scale) picked in Cursor, so it's copy-pasteable into your project docs?
