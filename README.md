# CRM — Frontend

Next.js UI for the CRM: leads, jobs, tasks, estimates, invoices, files, and
the rest of the workspace. It talks to the Express API in `crm_backend` over
REST. End-to-end coverage lives in the sibling `crm_qa` repo — this package
has no test runner of its own.

## Stack

- **Next.js 16** App Router (JavaScript, not TypeScript)
- **React 19**
- **Tailwind CSS 3** mapped to CSS variables
- **next-themes** for light / dark / system
- Custom **palette registry** (`data-palette` on `<html>`)
- REST via `src/lib/api.js` (`fetch`, cookie credentials)
- No Redux / Zustand — page-local React state plus `localStorage`

Also in the tree: `@dnd-kit` (kanban), `recharts`, `react-day-picker`.

## Related repositories

This folder is `crm_frontend`. Sibling checkouts expected next to it:

| Repo          | Role                                                     |
| ------------- | -------------------------------------------------------- |
| `crm_backend` | Express + PostgreSQL API (`localhost:4000`)              |
| `crm_qa`      | Playwright harness against a dedicated `crm_qa` database |

## Run locally

Needs Node and a running backend (see `crm_backend/README.md`).

```bash
npm install
```

Create `.env.local` (gitignored) with the variables below, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Next’s default port is
**3000**; the API is **4000**. The QA harness uses 3100 / 4100 on purpose so
it never collides with this pair.

There is no register screen. The first owner account is created against the
API (`POST /auth/register`); after that, sign in at `/login`. Later users
come in through invite → `/accept-invite`.

## Environment variables

| Variable                   | Where it is read                                             | Typical local value     |
| -------------------------- | ------------------------------------------------------------ | ----------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser (`src/lib/api.js`, `src/lib/helper.js`)              | `/api`                  |
| `API_INTERNAL_BASE_URL`    | Server (`next.config.mjs` rewrite, SSR, notifications proxy) | `http://localhost:4000` |

The browser calls `/api/...`. Next rewrites that to the backend so cookies stay
same-origin. Do not point `NEXT_PUBLIC_API_BASE_URL` at `:4000` in local dev
unless you have also set up cross-site cookies.

## Scripts

| Command          | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `npm run dev`    | Next dev server (port 3000)                       |
| `npm run build`  | Production build                                  |
| `npm start`      | Serve the production build                        |
| `npm run lint`   | ESLint (`eslint-config-next`)                     |
| `npm run format` | Prettier (includes `prettier-plugin-tailwindcss`) |
| `npm run icons:pwa` | Rasterize PWA PNGs from `public/icons/*.svg`   |

## Layout

```
src/
  app/           App Router routes (one folder per surface)
  components/    shell, workspace (preferences, AdminOnly), peek, records,
                 documents (estimate/invoice parts), jobs, today, lists,
                 forms, kanban, calendar, ui primitives
  lib/           api client, lifecycle vocabulary, documents, record events,
                 url filters, preferences, helpers, status tones
  theme/         Palette registry and token maps
  assets/        Logo
  proxy.js       Next.js 16 request proxy (auth redirects)
docs/            Older design language and visual-overhaul notes (history)
```

There is no `hooks/`, `store/`, or Pages Router `pages/` tree. Almost every
`page.js` is a client component. `src/app/layout.js` and `src/app/page.js`
(`/` → dashboard or login) are server components.

`src/app/` **routes:** dashboard, leads, jobs, tasks, invoices, estimates
(detail / new / edit / templates — no estimates index), files, users, reports,
automation, integrations (ABC, QuickBooks), login, accept-invite, and public
portal / intake / estimate pages.

## Routing and shells

Three shells. Do not mix them.

| Shell  | Use on                                                 | Component                       |
| ------ | ------------------------------------------------------ | ------------------------------- |
| App    | Signed-in workspace                                    | `AppShell` — the only page `h1` |
| Auth   | `/login`, `/accept-invite`                             | `AuthFrame`                     |
| Public | `/public/portal`, `/public/intake`, `/public/estimate` | `PublicFrame`                   |

`src/proxy.js` is Next 16’s proxy file (the old `middleware` convention). Its
matcher covers `/dashboard`, `/leads`, `/tasks`, `/files`, `/jobs`,
`/notifications`, `/settings`, `/login` and `/register`. Other signed-in
routes redirect in the page: owner/admin areas (`/users`, templates,
automation, integrations) go through `AdminOnly`, which sends a signed-out
visitor to `/login` and tells anyone else the area is for owners and admins.
`/invoices` and record pages outside the matcher (such as `/estimates/:id`)
still render the shell before the API answers 401 (a known gap; see
`crm_qa` auth tier 3). Widen the matcher when you add a
protected page that should bounce before paint.

## Shared UI (the Workbench)

Reuse these instead of inventing a parallel set:

- **Chrome:** `AppShell` (rail, top bar, phone tab bar, Create, search,
  inbox), `CommandPalette`, `AuthFrame`, `PublicFrame`
- **Workspace state:** `useWorkspace()` from
  `components/workspace/workspace-provider.js` — user, role, preferences,
  pins. Preferences save to the server (`/me/preferences`).
- **Lists:** `RecordTable` with `lists/columns.js`, `PageToolbar`,
  `Segmented` filters with counts, `SavedViewsControls`. Filters live in the
  URL through `useUrlFilterSync` (`lib/url-filters.js`); a saved view is
  `?view=<id>` and can be pinned.
- **Peek:** `PeekLink` / `usePeek().openPeek(kind, id, { intent })` open a
  record beside where you are (`?peek=kind:id`). `intent: "pay"` and
  `"deposit"` open an invoice or estimate with that form ready.
- **Records:** `components/records/record-layout.js` (`Tabs` + `useUrlTab`,
  `RailPanel`, `useRecordSections`) and `record-bits.js` (`StatusPill`,
  `Eyebrow`, `RecordUnavailable`). Head pattern: `record-head` with the
  status, related records, the big number, Pin, More, and the next step.
- **Next step:** the backend computes the job's next step
  (`job.next_step`); `JobNextStep` gives each action a control.
  `EstimateNextStep` and `InvoiceNextStep` (`components/documents/*`) do the
  same for documents, so the record, its peek and the job agree.
- **Keeping screens current:** after a write, `announceChange({ kind, id,
  jobId })` (`lib/record-events.js`); anything showing that record or job
  reloads through `useRecordChanges`.
- **Older pieces still in use:** `SectionCard`, `StatusBadge`, `StatCard`
  (reports), `DataTable` (Files, Users, team report), `DetailHeader` (task
  page only), `AttentionStrip` (tasks).
- **Forms:** `Field`, `FormActions`, entity forms under `components/forms/`
- **Feedback:** `Alert`, `EmptyState` / `PageError`, toasts, skeletons

The lifecycle vocabulary in `lib/job-lifecycle.js` and `lib/status-tones.js`
mirrors the backend by hand. `crm_qa`'s `npm run qa:drift-check` fails when
they disagree, so change both sides together.

## Design system

Do not paste tokens or layout rules into new files — follow these:

- `src/app/workbench.css` — the Workbench classes (shell, record head, next
  step, peek, documents, lists) in the Field Ledger language
- `crm_backend/docs/EXPERIMENT_UI_UX.md` — the Workbench thesis, layout and
  preference model
- [src/theme/tokens.md](src/theme/tokens.md) — CSS variables, palettes, print/PWA
- [docs/design-language.md](docs/design-language.md),
  [docs/VISUAL_OVERHAUL.md](docs/VISUAL_OVERHAUL.md),
  [docs/crm-design-language.md](docs/crm-design-language.md) — pre-Workbench
  page structure and visual work, kept for history

Appearance goes through CSS variables from `src/theme` and Tailwind mappings in
`tailwind.config.js`. No raw palette colors (`red-500`, `green-50`, …) for chrome
or status. Do not branch UI on palette ids.

## Adding a page

1. Add a kebab-case `page.js` under `src/app/<route>/`.
2. `"use client"` unless the page is a server redirect like `/`.
3. Pick the shell from the table above. `AppShell` `title` is the only `h1`.
4. Fetch with `api()` from `@/lib/api` (JSON + cookies). File URLs use
   `API_BASE` from `@/lib/helper`.
5. Work indexes (leads, jobs, tasks, invoices): `RecordTable` + `Segmented`
   with counts + `PageToolbar` + `SavedViewsControls`, filters synced to the
   URL. Rows open in the peek.
6. Tool panels (files, users, templates, automation, reports, integrations):
   same chrome, **no** urgency metrics. Owner/admin areas wrap their content
   in `AdminOnly`.
7. Records copy the job, estimate and invoice pages: the record head with
   its next step, `Tabs` for the body, an optional details rail, and
   `RecordUnavailable` when the record cannot be shown.
8. Creating: one full form per type at `/<type>/new` (prefill with query
   params such as `?job_id=` or `?lead_id=`), reached from Create or the
   list's New button. Lists do not carry their own inline create.
9. If the route should be unreachable while signed out, add it to `proxy.js`
   `protectedRoutes` **and** `config.matcher`.

## Current design status

The product runs on the Workbench layout (`experiment/CC_ui_reimagination`):
one workspace the person shapes, records that open beside the list, and the
next step always in view, drawn in the "Field Ledger" visual language
(`src/app/workbench.css`). `experiment/CC_revise` made the money and document
path run through it end to end. Decision logs: `crm_backend/docs/EXPERIMENT.md`
(lifecycle and money), `EXPERIMENT_UI_UX.md` (Workbench) and
`EXPERIMENT_REVISE.md` (this pass). Older layout docs in `docs/` describe the
pre-Workbench pages and are kept for history.

Palettes: Rooftop (default) plus Azure, Slate, Emerald, Violet, Rose, Sand and
Graphite, chosen per person or as the company default.

## PWA

Staff install only. Customer portal, intake, and estimate pages stay normal web pages and do not register the service worker.

Install icons and manifest colors are the product (Rooftop), not a company logo or palette. `npm run icons:pwa` regenerates the PNGs from `public/icons/icon-192.svg` and `icon-512.svg` (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`).

`public/sw.js` precaches `public/offline.html` and caches same-origin scripts, styles, images, and fonts. It does not cache `/api`, `/uploads`, `/public/*`, or App Router RSC requests. `/sw.js` is served with `Cache-Control: no-cache`.

Chromium shows **Install app** in Settings when the browser offers a prompt. iOS Safari shows a dismissible Add to Home Screen hint on `/login` only. A real-device install needs HTTPS (or a trusted local tunnel; `allowedDevOrigins` in `next.config.mjs` lists the current ngrok host).

Playwright cannot prove install, iOS cookie persistence, or notched safe areas. That checklist is in `crm_qa/docs/pwa-manual.md`.

## Tests

None in this repo. `crm_qa` runs Playwright against a staged production build
of this app. `crm_backend` owns API integration tests.
