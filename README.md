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

## Layout

```
src/
  app/           App Router routes (one folder per surface)
  components/    Shell, lists, forms, dashboard, kanban, calendar, ui primitives
  lib/           api client, helpers, search recents/filters, status tones
  theme/         Palette registry and token maps
  assets/        Logo
  proxy.js       Next.js 16 request proxy (auth redirects)
docs/            Design language, tokens, visual-overhaul checklist
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
matcher only covers `/dashboard`, `/leads`, `/tasks`, `/files`, `/jobs`,
`/notifications`, and `/login`. Other signed-in routes either redirect in the
page (`/users`) or currently render the shell unsigned (`/invoices` is the
documented example). Widen the matcher when you add a protected page that
should bounce before paint.

## Shared UI

Reuse these instead of inventing a parallel set:

- **Chrome:** `AppShell`, `AuthFrame`, `PublicFrame`, `CommandPalette`
- **Lists:** `EntityList` (`layout="flush"`) for work records; `DataTable` for
  Files and Users
- **List chrome:** `PageToolbar`, `Segmented`, `SavedViewsControls`
- **Metrics:** `StatCard`, `AttentionStrip`
- **Records:** `DetailHeader` (no second title), `SectionCard`, `StatusBadge`,
  `HealthBadge`
- **Forms:** `Field`, `FormActions`, entity forms under `components/forms/`
- **Entity rows:** `leads-list`, `jobs-list`, `tasks-list`, `invoices-list`
- **Feedback:** `Alert`, `EmptyState` / `PageError`, toasts, skeletons

`ListToolbar`, `FilterBar`, `ActionQueue`, and `ToggleFormSection` are leftover
and unused. Prefer `PageToolbar` and `SectionCard`.

## Design system

Do not paste tokens or layout rules into new files — follow these:

- `[docs/design-language.md](docs/design-language.md)` — locked page structure
  (headers, lists vs tool panels, Job as the detail template, forms, auth/public)
- `[src/theme/tokens.md](src/theme/tokens.md)` — CSS variables, palettes, print/PWA
- `[docs/VISUAL_OVERHAUL.md](docs/VISUAL_OVERHAUL.md)` — phased visual work
- `[docs/crm-design-language.md](docs/crm-design-language.md)` — archive (classic vs new teardown)

Appearance goes through CSS variables from `src/theme` and Tailwind mappings in
`tailwind.config.js`. No raw palette colors (`red-500`, `green-50`, …) for chrome
or status. Do not branch UI on palette ids.

## Adding a page

1. Add a kebab-case `page.js` under `src/app/<route>/`.
2. `"use client"` unless the page is a server redirect like `/`.
3. Pick the shell from the table above. `AppShell` `title` is the only `h1`.
4. Fetch with `api()` from `@/lib/api` (JSON + cookies). File URLs use
   `API_BASE` from `@/lib/helper`.
5. Work indexes (leads, jobs, tasks, invoices): `EntityList` + status
   `Segmented` with counts + `PageToolbar`. Pipeline pages do not get an
   overdue `StatCard` strip; Tasks may.
6. Tool panels (files, users, templates, automation, reports, integrations):
   same chrome, **no** urgency metrics. Files/Users stay `DataTable`.
7. Details copy Job: `DetailHeader` without a heading, stacked `SectionCard`s,
   related records in the subtitle — not a second column.
8. Full new/edit forms: AppShell + one card of `Field` / `FormActions`. Inline
   create stays on the list for leads, jobs, and tasks.
9. If the route should be unreachable while signed out, add it to `proxy.js`
   `protectedRoutes` **and** `config.matcher`.

## Current redesign status

Classic vs “new” layouts are historical. The folders `dashboard/classic` and
`leads/classic` listed in older tree docs are gone. The hybrid in
`design-language.md` is the spec.

Visual-overhaul phases 1–9 (tokens, primitives, theme controller, chrome,
product surfaces, charts, public pages, PDFs/email, PWA) are done. User-selectable
palettes shipped (Rooftop default plus Azure, Slate, Emerald, Violet, Rose, Sand,
Graphite). Optional leftovers: persist palette on `users.theme_palette`, and
Phase 11 polish (reduced motion, high-contrast, focus audit, …).

Command-palette expansion (recents, actions, aliases, create-from-query,
filters, contextual results) is done. Job is the detail template; Measurements
and Activity still collapse, as does Invoice Timeline.

## Tests

None in this repo. `crm_qa` runs Playwright against a staged production build
of this app. `crm_backend` owns API integration tests.
