# Experiment: Brand — Joist (`experiment/CC_brand`)

Branch cut from `experiment/CC_help`. The decision log (the icon
exploration, why this mark, the two brand layers, schema and data, QA
results, what was left) is `crm_backend/docs/EXPERIMENT_BRAND.md`. Usage
rules for anyone changing the brand: `src/theme/brand.md`.

## In this repo

| Area | Files |
|---|---|
| The one drawing of the mark | `src/assets/brand/joist-mark.svg` |
| Every icon generated from it; `--check` for drift | `scripts/generate-pwa-icons.mjs` (`npm run icons:pwa`) |
| Generated: tab, iOS, installed app, offline | `src/app/icon.svg`, `src/app/favicon.ico`, `src/app/apple-icon.png`, `public/icons/*`, `public/offline.html` |
| Mark, lockup, Powered by Joist; the words | `src/components/brand/joist.js`, `src/lib/brand.js` |
| Company mark: logo, icon, or initials on the company's accent | `src/components/brand/company-mark.js`, `src/lib/monogram.js` |
| Callers passing the whole company | `components/shell/nav-rail.js`, `components/app-shell.js`, `app/settings/page.js`, `components/modals/company-branding-modal.js`, `app/register/page.js` |
| One brand at a time on sign-in, register, accept-invite | `components/auth/auth-frame.js`, `app/login/page.js`, `app/accept-invite/page.js`, `components/theme/theme-controller.js` |
| Customer pages: company header, quiet loading tile, Powered by Joist | `components/public/public-frame.js`, `app/public/*/[token]/page.js` |
| 404 and errors | `app/not-found.js`, `app/error.js`, `app/global-error.js`, `components/brand/status-page.js`, `components/error-boundary.js` |
| Metadata: Joist, the description, no trade list | `app/layout.js`, `app/manifest.js` |
| theme-color survives Next's head rewrite after sign-in | `theme/sync-theme-color.js`, `components/theme/theme-controller.js` |
| Ember label (id stays `rooftop`) | `theme/themes/rooftop.js`, `theme/tokens.md` |
| Removed | `src/assets/mainlogo.svg` (Rooftop's logo, now on Rooftop's row), `public/icons/apple-touch-icon.png` (now `app/apple-icon.png`), the five unused starter SVGs |
| Service worker re-caches the new offline page | `public/sw.js` (`crm-v6`) |

The first commit on the branch is the owner's own `next.config.mjs` LAN
address, committed with their go-ahead.

## Checks

```bash
npm run icons:pwa -- --check
npx eslint .
```

`9 brand files match src/assets/brand/joist-mark.svg`. ESLint: 0 errors,
1 warning (`<img>` in `company-mark.js`, there before this pass).
