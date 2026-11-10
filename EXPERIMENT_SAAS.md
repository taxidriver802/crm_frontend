# Experiment: SaaS plan (`experiment/CC_saas_plan`)

Branch cut from `experiment/CC_final` at `5b6b52918192`. The plan, ranking
the work that makes Joist hostable, is
`crm_backend/docs/EXPERIMENT_SAAS.md`.

**This repository's product code did not change.** This file is the only
change on the branch.

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
