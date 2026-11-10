# Brand

**Joist** is the product. A company is a tenant. Two brands share the screen and never compete.

## Two layers

| Layer | What it is | Who decides |
| --- | --- | --- |
| **Joist** (app brand) | The name and the mark below. Fixed. | Nobody per install |
| **Company** (tenant brand) | Uploaded logo, chosen icon mark or initials, palette, company name | The company owner, in Settings → Company look |

Once a company is known, Joist steps back to a footnote or disappears.

| Surface | Brand | Where |
| --- | --- | --- |
| Browser tab icon, installed app icon and name | Joist | `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, `public/icons/`, `manifest.js` |
| Signed-out tab title | Joist | `layout.js` metadata |
| Signed-in tab title | Company: `<company> CRM` | `components/app-shell.js` |
| Sign-in, before a company is known; register (always) | Joist lockup | `components/auth/auth-frame.js` |
| Sign-in once a slug resolves (typed or remembered), accept-invite | Company mark and name | same |
| Nav rail, phone top bar, Settings | Company | `nav-rail.js`, `app-shell.js`, `settings/page.js` |
| Customer pages (intake, estimate, portal, invoice) | Company header, plus one muted **Powered by Joist** line | `components/public/public-frame.js` |
| Invite email | Company card, plus one muted **Powered by Joist** line | `crm_backend/src/lib/invite-email.ts` |
| Offline page | Joist (inline mark, the service worker caches this page) | `public/offline.html` |
| 404 / error with no company on screen | Joist lockup | `components/brand/status-page.js` |
| 404 / error inside the staff shell | None extra; the company rail is already there | same |
| Loading with no company yet | Quiet empty tile, never another brand | `CompanyMark` with no name |

Never show both brands at full size. Never show **Powered by Joist** in the staff shell.

## The mark

An engineered wood I-joist in section, with half its bottom flange cut away so the profile reads as a **J**. Two solid flanges, a thinner web, on a rounded tile.

- Tile `#363a43` (Ember's `--chrome`), web and bottom flange `#f4f4f5`, top flange `#f97316` (Ember's accent). The orange is the one accent; it never fills the tile.
- Drawn on a 32-unit grid. Every edge is on an even unit, so it is pixel-sharp at 16px and 32px. Glyph box: 20×20 units, centred, 6 units of tile on every side. Tile radius 7 units.
- No lettering inside the mark.
- **Minimum size: 16px.** `JoistMark` will not render smaller.
- Monochrome: the glyph alone in one colour, no tile (`tone="quiet"`, used at low contrast for loading).

Why this one, and the directions that lost: `crm_backend/docs/EXPERIMENT_BRAND.md`.

## Wordmark and lockup

- The word **Joist** is set in the app's sans (Geist), semibold, tracking-tight. It is live text, not a drawing.
- It appears only beside the mark, and only when the mark is **24px or larger** (`JoistLockup` clamps to 24). Below that, use the mark alone.
- Proportions (in `JoistLockup`): word size ≈ 0.72 × mark size, gap ≈ 0.33 × mark size, vertically centred.
- Attribution is text only: **Powered by Joist**, 11px, `--text-soft`, no link (there is no Joist site).

## Clear space

Keep one flange height clear around the mark or lockup: **3/16 of the mark's size** (6px at 32px). Nothing else in that margin: no text, no border, no other mark.

## Company monograms

A company with an uploaded logo shows the logo. A company that chose an icon mark shows that icon. Otherwise (the stored default mark id `product`, kept for existing rows) it shows its initials:

1. Split the name on spaces and commas.
2. Drop a leading **The** if another word follows.
3. Drop trailing **LLC, L.L.C., Inc, Incorporated, Co, Company, Corp, Ltd, PLC** while another word remains (case and dots ignored).
4. One word left: its first letter. Two or more: the first letters of the first two words.

"Rooftop Realty" → **RR**. "The Gutter Guys LLC" → **GG**. "Northside" → **N**.

The tile is the **company's** accent (from its palette, not the viewer's personal one) with that palette's `--on-accent` ink, at the same radius as a logo (`rounded-theme-sm`). Rules: `src/lib/monogram.js`, mirrored in `crm_backend/src/lib/monogram.ts`; both are checked against `crm_backend/test/fixtures/monogram-cases.json`.

Rooftop Realty's logo is Rooftop Realty's row's logo (`builtin/rooftop-realty.png` in `crm_backend/assets/company-logos/`). It is no one's default.

## Files: one source, generated copies

| File | Role |
| --- | --- |
| `src/assets/brand/joist-mark.svg` | **The only drawing. Edit this.** |
| `src/components/brand/joist.js` | `JoistMark`, `JoistLockup`, `PoweredByJoist`. Imports the drawing through SVGR. |
| `src/lib/brand.js` | The words: `Joist`, the description, `Powered by Joist` |
| `scripts/generate-pwa-icons.mjs` | `npm run icons:pwa` writes every copy below from the drawing; `-- --check` fails on drift |
| `src/app/icon.svg`, `src/app/favicon.ico`, `src/app/apple-icon.png` | Generated. Tab and iOS icons (Next file conventions; do not add `icons` to layout metadata, it suppresses these) |
| `public/icons/icon-192/512.svg/png`, `icon-512-maskable.png` | Generated. Installed app. Maskable keeps the mark inside the centre 80% |
| `public/offline.html` | Generated block between `joist-mark:start` and `joist-mark:end` |

Do not redraw the mark in a component, a CSS background or another SVG. Change the source, run `npm run icons:pwa`, commit the outputs.
