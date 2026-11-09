# Experiment: Help (`experiment/CC_help`)

Branch cut from `experiment/CC_revise`. The decision log — the guide, the
panel rules, the one-source check, verification and what was left out — is
in `crm_backend/docs/EXPERIMENT_HELP.md`.

## In this repo

| Area | Files |
|---|---|
| Which article answers which moment (no words of its own) | `src/lib/help.js` |
| Panel and the open-article URL | `src/components/help/help-panel.js`, `src/components/help/help-provider.js` |
| Account menu, phone menu, shortcuts line, shell | `src/components/shell/user-menu.js`, `src/components/shell/nav-rail.js`, `src/components/shell/shortcuts.js`, `src/components/app-shell.js` |
| ⌘K Help group | `src/components/command-palette.js` |
| How? on the job's next step and the invoice's current action | `src/components/jobs/job-next-step.js`, `src/components/documents/invoice-parts.js` |
| Empty Today | `src/components/today/widgets.js` |
| Help icon and panel styles | `src/components/icons.js`, `src/app/workbench.css` |
| A new appointment says **Schedule appointment** | `src/components/forms/task-form.js`, `src/app/tasks/new/page.js` |

## Checks

```bash
npx eslint .
```

0 errors, 3 warnings, all in files this pass does not touch.
