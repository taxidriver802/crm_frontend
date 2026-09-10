# Command Palette Expansion

Expand the global search/command palette ([`command-palette.js`](../src/components/command-palette.js), wired into [`app-shell.js`](../src/components/app-shell.js) via `searchOpen` / `CommandPalette`). Ship in this order — each step should be a separate, reviewable change.

Work this plan **one step at a time**. Mark status as you go.

| Step | Status |
| --- | --- |
| 1. Recents + more record types | Done |
| 2. Generalize item renderer + Actions mode | Done |
| 3. Aliases + app bar affordance | Done |
| 4. Create-from-query | Done |
| 5. Filters / operators | Done |
| 6. Contextual results + deep links | Done |

---

## Agreed decisions

These replace the earlier open questions:

1. **Step 1 includes backend `/search` expansion** for invoices, estimates, files, and users (not frontend-only). Gate users/team appropriately (match how the Users page is authorized).
2. **Recents record both palette selects and entity detail navigations** from the shell (pathname matches), same capped/deduped store.
3. **Actions use a `>` prefix**; Ctrl stays Results ↔ Pages (step 2).
4. **Create-from-query uses existing create paths** plus minimal query-param prefill (step 4).
5. **Filters: client token parse + structured backend params** (step 5).

---

## Open questions / disagreements

_Resolved — see **Agreed decisions** above._

---

## 1. Recents (empty state) + more record types

- Right now, when the query is empty and we're in Results mode, the palette shows a static "Start typing to search your workspace" message. Replace that with a recents list: last-visited records and pages, most recent first.
  - Track recents on navigation — wherever we currently call `clearReturnStack()` on select (both the `Link onClick` and the `Enter` keydown handler), also record `{ href, label, sublabel, icon, group }` to a small recents store, capped at 5 entries, deduped by `href`.
  - **Also** record visits from normal app navigation for entity detail routes (see disagreement #2), so the list is useful before the palette is heavily used.
  - Persist with the same pattern as `DESKTOP_SIDEBAR_STORAGE_KEY` in `app-shell.js` (localStorage, wrapped in try/catch).
  - When `!hasQuery && !isPagesMode`, render the recents list through the existing `groupedItems` pipeline instead of the empty-state message (give it its own group, e.g. "Recent").
- Extend search **backend +** `flattenResults` to include invoices, estimates, files, and users/team, same shape as the existing lead/job/task loops (icon, label, sublabel, group, href). Confirm what fields `GET /search` returns for each of these and adjust the sublabel accordingly (e.g. invoice → amount/status, file → filename/type, user → role).
- Ship these two together — they reuse the same rendering path and don't touch keyboard handling.

## 2. Generalize the item renderer, then add Actions mode

- Before building actions, refactor the item renderer so each item can be either a navigation target (`href`) or an action (`onSelect`), instead of assuming every item is a `Link`. This keeps `groupItems`, the active-index keyboard nav, and the `Enter`/click handlers shared across pages, results, recents, and actions rather than duplicating that machinery into a fourth parallel mode.
- Add an Actions entry point — prefer a `>` prefix on the query (see disagreement #3). Optionally highlight an Actions pill when that prefix is active; keep Ctrl as Results ↔ Pages.
- Seed it with a small hardcoded action list to start: "Create lead", "New task", "Mark all notifications read", "Invite user" (gate this one on `isAdminUser`, same check `app-shell.js` already uses for nav/settings). Each action's `onSelect` should do what the existing UI affordance does today (e.g. open `InviteUserModal`) rather than reimplementing that logic — the palette will need a way to call back into `AppShell` state for these (`setInviteModalOpen`, etc.), so plan how that callback gets passed down as part of this step.

## 3. Command aliases + app bar affordance

- Add short aliases to `QUICK_NAV_ITEMS` (`inv` → Invoices, `est` → Templates, `dash` → Dashboard, etc.) via the existing `keywords` field — no new mechanism needed.
- On `lg+`, replace the icon-only search trigger in the topbar (`AppShell`'s `header`) with a slim `Search… ⌘K` field that opens the same palette, matching the rest of the topbar chrome.

## 4. Create-from-query

- When a search in Results mode returns no matches for a query, add a trailing action item — "Create lead named '…'" / "Create task '…'" — using the action pattern from step 2. Selecting it should route to the relevant create path (see disagreement #4) pre-filled with the query text.

## 5. Filters / operators

- Do this after steps 1–4, since it changes the query pipeline shape rather than just adding to it. Support tokens like `lead:`, `job:`, `status:open`, `assigned:me` in the search input.
- Decide up front: parse tokens client-side and filter the existing `/search` response, or pass structured params to the backend. Check what the `/search` endpoint already supports server-side before choosing. **Lean: client parse + backend structured params** (disagreement #5).
- Show active filters as removable chips under the input so it's clear what's narrowing the result set.

## 6. Contextual results + deep links into tabs

- When the palette is opened from a lead/job/invoice detail route, AppShell passes `entityContext` into the palette.
- `/search` accepts `contextType` + `contextId` and returns a `related` payload (tasks/files/invoices/estimates for jobs; jobs/tasks/files for leads), shown first as **On this {entity}**.
- Detail pages do not have tab routes today; deep links use section hashes instead (`#section-files`, `#section-activity`, `#section-timeline`) with matching `id`s on those sections.
- **Section jumps are opt-in** via `jump:` (Filters menu + chip when on a detail page). They render in a separate **Jump** group — not mixed into Recents or the top of **On this {entity}**. Jump / `#` hrefs are never written to recents.

---

## Constraints to respect throughout

- Keep `flattenResults` / `groupItems` as the single source of truth for what's rendered — new item types (recents, actions, create-from-query) should flow through the same grouping and keyboard-nav logic, not bypass it.
- Match existing icon usage (`Icon` component, same icon names already used elsewhere) and existing Tailwind utility classes/patterns already in `command-palette.js` (`dropdown-panel`, `text-muted`, `rounded-theme-sm`, etc.) — no new design tokens.
- Persisted client state (recents) follows the same localStorage try/catch pattern as `readDesktopSidebarOpen` / `writeDesktopSidebarOpen` in `app-shell.js`.
