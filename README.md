# Healthcare.AI

A calm, careful record of your heart, for people living with heart conditions and the family who help them.

> **Planning docs:** [Product Requirements (PRD)](docs/PRD.md) · [Technical Implementation Plan](docs/TECH_PLAN.md) · [Design system](DESIGN.md)

## What it does

1. **Readings, checked as you enter them.** Blood pressure, pulse, oxygen, glucose, temperature, cholesterol and weight, classified against clinical ranges and charted over time.
2. **Medicines that remind you.** A daily checklist (taken, skipped, missed), 7- and 30-day adherence, and reminders on your phone or computer through Web Push, with a "Taken" button right in the notification.
3. **An assistant that reads your record.** Questions answered from your own readings, medicines and symptoms (Cloudflare Workers AI). Fixed rules catch emergencies before any model runs, and it never tells you to change a medicine.
4. **A care team.** Invite family by email and choose what they see. They get alerts for emergency-range readings, urgent symptoms and missed doses, and you can see each time they looked.
5. **Reports and sharing.** Upload lab results and scans; share chosen reports through a link or QR code that expires and can be revoked.
6. **Visit summary.** A one-page summary to print or save as PDF for your doctor, with suggested questions.
7. **Yours to keep or delete.** Download everything as JSON, or delete your account and every file at once.

Installable as an app (PWA) and the emergency button works offline.

## Tech Stack

Runs entirely on Cloudflare's free plan (see [docs/TECH_PLAN.md](docs/TECH_PLAN.md) for why).

- **Frontend:** Vite + React 19 single-page app, React Router, TanStack Query, Tailwind CSS, Recharts, Lucide icons; installable PWA with a service worker
- **API:** Hono on Cloudflare Workers, typed end to end (the browser client gets its types from the API)
- **Data:** Cloudflare D1 (SQLite) with Drizzle ORM and migrations
- **Auth:** Better Auth with email + password (stretched in the browser, see below), email verification and password reset by code, JWT session cookies and Bearer access tokens, optional Google sign-in and Cloudflare Turnstile
- **AI:** Cloudflare Workers AI (Llama 3.3 70B by default, `AI_MODEL`), with server-built context, rule-based emergency checks, consent and a daily quota
- **Notifications:** Web Push implemented on Web Crypto (VAPID + RFC 8291), and email through Resend; both go through an outbox that retries
- **Jobs:** one cron trigger dispatches dose generation, reminders, missed-dose alerts and the outbox
- **Validation and clinical rules:** Zod schemas and rule functions in `src/shared`, used by both the API and the browser
- **Tests:** Vitest running inside Cloudflare's runtime against a real local D1

## Getting Started

Requires Node 22+ and a Cloudflare account (free) for deploying.

```bash
npm install
cp .dev.vars.example .dev.vars        # then set BETTER_AUTH_SECRET to a long random string
npm run db:migrate:local
npm run dev                           # http://localhost:5173
```

Locally `EMAIL_MODE=outbox` keeps emails (verification and reset codes) in the database; read the latest one:

```bash
npx wrangler d1 execute DB --local --command "SELECT recipient, payload FROM outbox ORDER BY created_at DESC LIMIT 1"
```

Checks:

```bash
npm run check    # typecheck, lint, tests, build
```

## Deploying

Live: https://healthcare-ai.mdmurtuzaali777.workers.dev

```bash
npx wrangler login                                   # once
npm run db:migrate:remote                            # apply new migrations first
npm run deploy                                       # build and deploy the Worker
```

Production secrets (set once with `npx wrangler secret put <NAME>`):
- `BETTER_AUTH_SECRET` and `PASSWORD_PEPPER` (both set; never change the pepper once users exist, or every password stops working)
- `RESEND_API_KEY`: turns on email verification and password reset. Until it's set, sign-up signs people in without verifying their email.
- `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`: turn on medicine reminders and caretaker alerts on devices. Generate them with `node scripts/vapid-keys.mjs`. Never change them once people have turned reminders on (their subscriptions would stop working).
- Optional: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (redirect URI `<APP_URL>/api/auth/callback/google`), `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.

The assistant uses the `AI` binding in `wrangler.jsonc` (no key needed). `AI_DAILY_LIMIT` sets questions per person per day; the free Workers AI allowance is shared by everyone, so keep it modest or move to Workers Paid.

CI runs on every push. To deploy automatically from `main`, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets in GitHub.

## Development skills

Agent skills (from [skills.sh](https://skills.sh)) used when building this app, installed per project in `.claude/skills/` (git-ignored, because not every source is licensed for redistribution):

| Skill | Source | Use |
|---|---|---|
| frontend-design | anthropics/skills @ 2c5958e | Distinctive, intentional visual design |
| impeccable | pbakaus/impeccable @ 687bc38 (without `scripts/`) | Critique, audit, polish, typeset, layout, onboarding |
| emil-design-eng | emilkowalski/skill @ c8a7962 | Motion, detail and component craft |
| web-design-guidelines | vercel-labs/agent-skills @ 1a2c79d | Accessibility and interface rules review |
| react-best-practices | vercel-labs/agent-skills @ 1a2c79d | React performance patterns |
| composition-patterns | vercel-labs/agent-skills @ 1a2c79d | Component architecture |

To install on another machine: `npx skills add <source> --skill <name>` (for example `npx skills add anthropics/skills --skill frontend-design`). The impeccable launcher in `scripts/` downloads and runs a binary; it was left out on purpose, and the skill falls back to reading `PRODUCT.md` and `DESIGN.md` directly.

## Project Structure

```
src/
├── client/      React app: routes/ (screens), components/, lib/ (API client, data hooks)
├── worker/      Cloudflare Worker: Hono routes, auth, dal/ (the only code that touches the database,
│                and where every access is authorized), db/schema.ts, jobs/ (cron), notifications/
└── shared/      Zod schemas and clinical rules used by both sides (vitals, symptoms, risk, emergency)
drizzle/         SQL migrations
tests/           Vitest suites (run in workerd)
docs/            PRD and technical implementation plan
(The previous Next.js + Supabase app was removed after the port; it is at commit 2cfbf56 under legacy/.)
```

Security notes:
- **Passwords:** the browser stretches the password with PBKDF2-SHA256 (600,000 rounds, salted with the email) and sends only the result. The server stores a salted HMAC of that with a secret pepper (~0.1 ms of CPU, so it fits the free plan). The password itself never reaches the server. Password rules and the Have I Been Pwned check run in the browser.
- **Sessions and tokens:** an httpOnly session cookie (revocable, in D1) plus a 5-minute signed JWT cookie cache. `GET /api/auth/token` issues 15-minute EdDSA access tokens; `/api/auth/jwks` publishes the public keys; the API accepts `Authorization: Bearer`.
- D1 has no row-level security, so every query goes through `src/worker/dal`, which checks the caller's access. A lint rule blocks database imports anywhere else.
- Emergency detection (vital thresholds, symptom red flags) is rule-based and runs without AI. Thresholds are pending clinician review.

## Use Cases

- **Early Disease Detection**: The system analyzes patient data to detect potential health issues early
- **Medication Management**: Helps patients stay on top of their medication schedules
- **Remote Monitoring**: Allows healthcare providers to monitor patients remotely
- **Health Trends Analysis**: Identify long-term patterns in health data
- **Care Coordination**: Facilitates communication between patients, caretakers, and healthcare providers
- **Medical Education**: Provides comprehensive information about health conditions and treatments

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Team

- Project Lead: [Your Name]
- UI/UX Design: [Designer Name]
- Frontend Development: [Frontend Dev Name]
- Backend Development: [Backend Dev Name]

## Acknowledgments

- Medical visualization inspired by professional cardiac monitoring systems
- Heart animation developed with guidance from medical professionals
