# Experiment: SaaS plan (`experiment/CC_saas_plan`)

Branch cut from `experiment/CC_final` at `5b6b52918192`. The plan, ranking
the work that makes Joist hostable, is
`crm_backend/docs/EXPERIMENT_SAAS.md`.

On `experiment/CC_saas_plan` this file is the only change. Progress is
ticked in the plan's **5. Sequence** checklist.

## Step 1 (`experiment/CC_public_host`)

- `next.config.mjs`: every page except `/api/*` sends
  `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`,
  `form-action 'self'`, `X-Frame-Options: DENY`, `nosniff` and
  `strict-origin-when-cross-origin`. Scripts aren't restricted yet (Next's
  inline scripts need a nonce-based policy, its own change).
- `components/modals/company-branding-modal.js`: logos are PNG, JPG or
  WebP. The backend checks the bytes.
- `.env.production.example` (read at build time) and a Production section
  in `README.md`. The runbook is `crm_backend/docs/guide/hosting.md`.

## Step 4 (`experiment/CC_way_back_in`)

- `app/forgot-password` and `app/reset-password`: new pages, outside the
  app shell (`components/app-shell.js` `isBarePath`) and branded like
  sign-in (`theme/public-path.js`). Forgot asks for slug and email. Without
  SMTP it says to ask an owner or admin. The reset page names the person
  and the company, and signs that browser in.
- `app/login/page.js`: a **Forgot password?** link.
- `app/settings/page.js`: a **Sign-in & password** section
  (`?tab=account`) with Change password and **Sign out everywhere else**.
- `app/users/page.js`: **Send password reset link** and **Account
  history** in each person's actions. Resend and reset links that weren't
  emailed are shown once to copy (`components/modals/account-modals.js`).
  The column is **Last sign-in**, with the time.
- Brand table (`theme/brand.md`) lists the new pages and the reset email.

## Where the plan reaches this repo

| Prospect | What it would touch here |
|---|---|
| 1. A public host that fails closed | A production start path for the Next build; invite links stop depending on `X-App-Base-Url` from `components/modals/invite-user-modal.js` |
| 2. Abuse limits | `next.config.mjs` `headers()`: `frame-ancestors` and a basic CSP; raster-only logos in `components/modals/company-branding-modal.js` |
| 3. Rows that can't land in another company | A QA sign-in as a second company; no UI change expected |
| 4. A way back in, and sessions that end | Forgot-password link on `app/login/page.js`, a reset page, change password in `app/settings/page.js`, the **Resend** behaviour and real last sign-in on `app/users/page.js` |
| 7. A company's account with Joist | What a suspended company's staff see on sign-in; the registration setting on `app/register/page.js` |
| 11. Each company's own clock | A timezone field in Settings |
| 12. Self-serve billing | An owner billing page |
