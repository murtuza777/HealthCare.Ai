# Contributing to Healthcare.AI

Thanks for wanting to help. This app is used to keep track of heart conditions, so the bar for
changes is "safe and tested", not "clever".

## Ways to help

- **Patients and caretakers:** tell us what's confusing, missing or wrong. Open an issue; no
  technical detail needed. Please don't include real health data or names.
- **Clinicians:** review the thresholds and red-flag rules in `src/shared/vitals.ts`,
  `src/shared/symptoms.ts`, `src/shared/assistant.ts`, `src/shared/insights.ts` and `src/shared/findings.ts`. A cited
  correction is the most valuable contribution this project can get.
- **Translators:** see the open issues labelled `i18n`.
- **Developers:** pick an issue labelled `good first issue`, or anything on the roadmap in the
  README.

## Getting set up

```bash
npm install
cp .dev.vars.example .dev.vars     # set BETTER_AUTH_SECRET to a long random string
npm run db:migrate:local
npm run dev                        # http://localhost:5173
```

Everything runs locally: a local D1 database, local file storage, and emails kept in the
database. The assistant needs a Cloudflare login (`npx wrangler login`) to reach Workers AI;
tests use a fake model and need no account.

## Before you open a pull request

```bash
npm run check     # typecheck, lint, tests, build
```

- Keep pull requests small and about one thing.
- Add or update tests for behaviour you change. Tests live in `tests/` and run against a real
  local database.
- New database access goes in `src/worker/dal/`, and every function there must check the
  caller's access. A lint rule blocks database imports elsewhere.
- Text shown to patients is plain, calm and specific. Body text is never below 16px. Red is
  only for alerts and emergencies. See `DESIGN.md` and `PRODUCT.md`.

## Rules that are never relaxed

1. **Emergency detection never depends on AI.** It is plain code in `src/shared`, and any
   change must keep every existing emergency test passing and add tests for the new case.
2. **The app never tells anyone to start, stop or change a medicine.**
3. **No health data leaves the patient's control without their explicit choice.** Sharing,
   caretaker access and AI processing are opt-in and revocable.
4. **No secrets, real patient data or real names** in code, tests, issues or screenshots.

## Reporting security problems

Please don't open a public issue. See [SECURITY.md](SECURITY.md).
