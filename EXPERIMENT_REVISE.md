# Experiment: Revise — make the base solid (`experiment/CC_revise`)

Branch cut from `experiment/CC_ui_reimagination`. The full decision log
(what was broken, what was solid, every change and the break it closes,
what was left alone or deferred, verification) is in
`crm_backend/docs/EXPERIMENT_REVISE.md`.

## In this repo

| Area | Files |
|---|---|
| Estimate and invoice records, each with its own next step | `src/app/estimates/[id]/page.js`, `src/app/invoices/[id]/page.js`, `src/components/documents/*`, `src/lib/documents.js` |
| The job's next step opens the document beside the job | `src/components/jobs/job-next-step.js`, `src/components/peek/*` (intents `pay`, `deposit`) |
| Money tab shows the picture only | `src/components/jobs/job-money.js` |
| Screens reload when a record changes elsewhere | `src/lib/record-events.js` |
| One answer when a record or admin area isn't yours | `RecordUnavailable` in `src/components/records/record-bits.js`, `src/components/workspace/admin-only.js` |
| Filters in the URL; saved views linkable and pinnable | `src/lib/url-filters.js`, `src/components/saved-views-controls.js`, the jobs, leads, tasks and invoices lists |
| Copy that says what is true | reports, Today widget names, copy-link and client-visible notes |
| Lint error fixed | `src/components/theme/theme-controller.js` (`useSyncExternalStore`) |

## Checks

```bash
npm run lint
```

0 errors, 3 warnings, all three in files this branch does not touch.
