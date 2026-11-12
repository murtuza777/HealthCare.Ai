# Healthcare.AI

**A shared heart-health record for people living with a heart condition, and for the family member who worries about them from another city.**

Log a blood pressure reading and know at once whether it's fine, worth watching or an emergency. Get a reminder for every pill. Let your daughter see that you took them. Walk into the cardiologist's office with one page that has everything on it.

[Live app](https://healthcare-ai.mdmurtuzaali777.workers.dev) · [Product requirements](docs/PRD.md) · [Technical plan](docs/TECH_PLAN.md) · [Design system](DESIGN.md) · [Contributing](CONTRIBUTING.md)

Free and open source under the [MIT license](LICENSE). Run your own copy for your family, a clinic or a support group on Cloudflare's free plan.

> **Status: working beta.** Every feature listed under "What works today" is built, tested and deployed. It hasn't had real users yet, and the clinical thresholds haven't been reviewed by a clinician. Not a medical device.

---

## The problem

Someone who has had a heart attack, or lives with high blood pressure, heart failure or atrial fibrillation, is usually managing all of this at once:

- three to six medicines on fixed times,
- blood pressure and pulse checks morning and evening,
- lab reports and scans from different clinics,
- symptoms that might be nothing, or might mean calling an ambulance.

Today that lives in a notebook, phone photos and memory. That leaves three gaps:

| Who | What goes wrong today |
|---|---|
| **The patient** | Forgets doses. Can't tell whether 158/96 is worrying. Arrives at appointments without their history. |
| **The family caretaker**, often an adult child in another city | Has no idea anything is wrong until a phone call from the hospital. |
| **The doctor**, with 10 minutes per visit | Sees whatever the patient remembered to bring. |

General health apps track steps and sleep. Chatbots can explain what "diastolic" means but know nothing about *you*, and may answer "I have chest pain" with an essay.

## Who it's for

| | Who | What they get |
|---|---|---|
| **Primary** | Patients aged 50–75 with a heart condition, comfortable enough with a phone | One record, clear verdicts on readings, medicine reminders, an assistant that knows their numbers |
| **Primary** | Their caretaker, usually a son or daughter living elsewhere | Alerts when a reading is in the emergency range, an urgent symptom is logged or doses are missed; a read-only view of what the patient chose to share |
| **Secondary** | Their doctor | A time-limited link or QR code to chosen reports and recent readings, with no account to create |
| **Secondary** | People with high blood pressure or a family history who want to track it | Trend charts, risk factors explained, a visit summary |

**It's not for** fitness tracking, diagnosis, telemedicine, hospitals or clinics (there's no doctor portal or EHR integration), or replacing emergency services.

## Why it's different

1. **Emergencies never wait for AI.** Dangerous readings (for example BP ≥ 180/120, SpO₂ < 90%) and red-flag symptoms (chest pain, signs of stroke, fainting) are caught by fixed, tested rules. The fixed rules show a red banner with a one-tap call to *your country's* emergency number. The emergency button works offline.
2. **The family is in the loop, with the patient in control.** The patient invites a caretaker, chooses exactly what they see, can see every time they looked, and can remove them instantly.
3. **The assistant answers from your record, not the internet.** "Am I taking my medicine regularly?" gets "You missed 2 doses of Amlodipine this week." It never tells you to change a medicine, and it points medicine questions to your pharmacist or doctor.
4. **Built for older eyes.** Large serif numbers, 16px minimum body text, high contrast, full keyboard and screen-reader support. Red is used only for alerts.
5. **Your data stays yours.** Export everything as JSON or delete your account and every file in one step. Nothing is sold or used for ads.

## What works today

### For the patient
- **Readings, checked as you type.** Blood pressure, pulse, oxygen, glucose, temperature, cholesterol and weight. Each reading is classified (normal, borderline, high, emergency range) against clinical ranges, with trend charts.
- **Import from your monitor.** Bring in months of readings from the CSV file a blood pressure monitor's app exports. The file is read on your device; importing it twice is harmless.
- **Trends you'd otherwise miss.** A daily check looks for blood pressure creeping up, a week that stayed high, a fast resting pulse, doses not being taken, sudden weight gain, and a week without readings. Fixed rules, no AI.
- **Medicines with reminders.** A daily checklist (taken, skipped, missed) and 7- and 30-day adherence. Push reminders arrive on your phone or computer with a **Taken** button right in the notification.
- **Symptoms with red flags.** Severity, duration and accompanying symptoms. Dangerous combinations trigger the emergency banner.
- **Heart risk snapshot.** Which risk factors you have, and which you can work on. Marked as an estimate, not a diagnosis.
- **Reports that are read for you.** Upload lab results, ECGs and scans (PDF or photo, up to 10 MB). The app copies out each test value and marks the ones outside the range printed on the report. You can correct anything it misread.
- **Appointments.** Add your next visit and get reminded the day before and two hours before, with your summary one tap away.
- **History.** Every reading, symptom, dose, report and alert in one feed, newest first.
- **Visit summary.** A one-page printable summary for your doctor: current medicines, adherence, reading trends, recent symptoms, out-of-range report results and AI-suggested questions to ask.

### The AI assistant
- Answers questions using your own profile, readings, trends, medicines, adherence, symptoms, report results and upcoming appointments.
- Say "my BP is 142/90" or "I have a headache" and it offers to save that to your record. Nothing is saved until you press Save.
- Streams replies, keeps conversation history, and lets you rate answers.
- Safety rules:
  - Emergencies happening now get a fixed, human-written reply before any model runs.
  - Questions that only mention an emergency get an answer plus the emergency number.
  - Readings in the emergency range always come with the same advice the app gives.
  - Medicine changes are always referred to a doctor or pharmacist.
- Needs your explicit consent, has a daily limit (25 questions), and returns your question and quota if the model fails.

### For the caretaker
- Invite by email. The patient picks permissions: readings, medicines and adherence, reports, alerts.
- A dashboard of the people you care for.
- Push and email alerts for emergency-range readings, urgent symptoms, missed doses and worrying trends.
- Quiet hours: choose when only emergencies should make your phone buzz.
- The patient's full history, limited to what they chose to share.
- An access log, so the patient sees every time a caretaker opened their record.

### For the doctor
- Share chosen reports, optionally with a summary of recent readings, through a link or QR code.
- The link expires after 1 hour, 24 hours or 7 days, and can be revoked at any time.
- The patient sees how many times each link was opened.

### Account and security
- Email and password sign-up with verification and reset codes; optional Google sign-in.
- The password is stretched in the browser and never reaches the server.
- Every database access goes through one authorization layer, enforced by a lint rule.
- Consent records, an audit log, data export and full account deletion.
- Installable as an app (PWA).

## How far along it is

| Area (from the [PRD](docs/PRD.md)) | Status |
|---|---|
| R1: Record (profile, readings, medicines, symptoms, reports, sharing, assistant, history, CSV import) | ✅ Done |
| R2: Reminders, adherence, caretakers, alerts, quiet hours, appointments | ✅ Done (sending email to anyone but the owner needs a verified sending domain) |
| R3: Report reader (values from PDFs and photos) | ✅ Done; checked against a sample lab PDF, photos need more real-world testing |
| R3: Daily monitoring of trends | ✅ Done, as fixed rules rather than AI |
| R3: Assistant that takes actions | 🟡 Saves readings and symptoms you state, on confirm. It doesn't yet create reminders or message a caretaker |
| R3: Visit summary | ✅ Done |
| R4: Export, deletion, consent, audit log | ✅ Done |
| R4: Clinician review of thresholds, compliance review, real users | ⬜ Not started |
| Smaller gaps | Refill reminders, repeating reminders, caretakers logging on a patient's behalf, languages other than English, device sync (Bluetooth cuffs, Apple Health, Google Fit) |

**By the numbers:**

| | |
|---|---|
| Application code | ~11,600 lines of TypeScript across the client, the API and shared rules |
| Screens | 20 |
| Tests | 237, run inside Cloudflare's runtime against a real database |
| Running cost | $0 on Cloudflare's free plan, until roughly 100 active users |
| Rebuild | Nov 5–11, 2026; it replaced an earlier Next.js + Supabase prototype |

## What would make it valuable

The app now covers the whole plan for a patient, their caretakers and their doctor. Its value now depends on things code alone can't settle:

1. **A first group of real users.** For example, 10 cardiac patients and their families from one clinic or support group, to learn whether the caretaker alerts are the reason people stay.
2. **A clinician advisor** to sign off the emergency thresholds and red-flag rules. Until then, the app can't honestly be offered to patients at scale.
3. **Even less typing.** Reports are now read for you, a monitor's export can be imported, and the assistant offers to save what you tell it. Syncing directly with Bluetooth BP cuffs, Apple Health and Google Fit is the next step.
4. **A launch market.** It decides the emergency numbers, units, language (Hindi/Urdu support matters if India), SMS or WhatsApp alerts, and the compliance regime (DPDP, HIPAA or GDPR).

The sharpest positioning is probably **"peace of mind for the family"**: the caretaker alert is something a notebook or a fitness app can't do, and it's usually the family member who would find, install and set up the app.

---

## Run it yourself

Requires Node 22+ and a free Cloudflare account to deploy.

```bash
npm install
cp .dev.vars.example .dev.vars        # then set BETTER_AUTH_SECRET to a long random string
npm run db:migrate:local
npm run dev                           # http://localhost:5173
npm run check                         # typecheck, lint, tests, build
```

Locally, emails (verification and reset codes) stay in the database. To read the latest one:

```bash
npx wrangler d1 execute DB --local --command "SELECT recipient, payload FROM outbox ORDER BY created_at DESC LIMIT 1"
```

### Deploy

```bash
npx wrangler login              # once
npm run db:migrate:remote       # apply new migrations first
npm run deploy                  # build and deploy the Worker
```

Production secrets, set once with `npx wrangler secret put <NAME>`:

| Secret | What it turns on | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET`, `PASSWORD_PEPPER` | Required | Never change the pepper once users exist, or every password stops working. |
| `RESEND_API_KEY` | Email verification, password reset, caretaker emails | Until it's set, sign-up signs people in without verifying email. |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | Push reminders and alerts | Generate with `node scripts/vapid-keys.mjs`. Never change them once people have turned reminders on. |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google sign-in (optional) | Redirect URI: `<APP_URL>/api/auth/callback/google` |
| `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Bot protection (optional) | |

The assistant uses the Workers AI binding, so it needs no key. `AI_DAILY_LIMIT` sets questions per person per day. The free AI allowance is shared by everyone, so keep it modest or move to Workers Paid ($5/month).

## How it's built

Runs entirely on Cloudflare's free plan.

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 single-page app, React Router, TanStack Query, Tailwind CSS, Recharts; installable PWA |
| API | Hono on Cloudflare Workers, typed end to end (the browser client gets its types from the API) |
| Data | Cloudflare D1 (SQLite) with Drizzle ORM; R2 for report files |
| Auth | Better Auth: browser-stretched passwords, email codes, session cookies, EdDSA access tokens, optional Google |
| AI | Workers AI: Llama 3.3 70B for chat and report values, a vision model and `toMarkdown` to read uploads; server-built context, rule-based emergency checks, consent and a daily quota |
| Notifications | Web Push implemented on Web Crypto (VAPID + RFC 8291), email through Resend, both through a retrying outbox |
| Jobs | One cron trigger: dose generation, dose and appointment reminders, missed-dose alerts, the daily trend review, outbox |
| Rules | Zod schemas and clinical rule functions in `src/shared`, used by both the browser and the API |

```
src/
├── client/      React app: routes/ (screens), components/, lib/ (API client, data hooks)
├── worker/      Hono routes, auth, ai/, dal/ (the only code that touches the database,
│                and where every access is authorized), db/schema.ts, jobs/, notifications/
└── shared/      Clinical rules and schemas: vitals, symptoms, risk, emergency, assistant, insights,
                 report values, CSV import
drizzle/         SQL migrations
tests/           Vitest suites (run in workerd)
docs/            PRD and technical plan
```

### Security notes
- **Passwords:** the browser stretches the password with PBKDF2-SHA256 (600,000 rounds, salted with the email) and sends only the result. The server stores a salted HMAC of that with a secret pepper.
- **Sessions:** an httpOnly, revocable session cookie, plus a 5-minute signed cookie cache. `GET /api/auth/token` issues 15-minute EdDSA access tokens.
- **Authorization:** D1 has no row-level security, so every query goes through `src/worker/dal`, which checks the caller's access. A lint rule blocks database imports anywhere else.
- **Emergency detection** is rule-based and runs without AI. The thresholds are still pending clinician review.
- **What AI is allowed to do:** answer questions from the record, suggest visit questions, and copy values out of an uploaded report. It never decides whether something is an emergency, whether a result is out of range, or what gets saved. Those are plain rules in `src/shared`.

### Development skills

Agent skills from [skills.sh](https://skills.sh) used while building, installed in `.claude/skills/` (git-ignored, because not every source can be redistributed): frontend-design (anthropics/skills), impeccable (pbakaus/impeccable, without `scripts/`), emil-design-eng (emilkowalski/skill), web-design-guidelines, react-best-practices and composition-patterns (vercel-labs/agent-skills). Install one with `npx skills add <source> --skill <name>`.

## Contributing

Issues and pull requests are welcome from developers, clinicians, translators, patients and caretakers. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

- Run `npm run check` before opening a PR.
- Anything that touches the clinical rules (`src/shared/vitals.ts`, `symptoms.ts`, `assistant.ts`, `insights.ts`) needs tests showing it still catches every case in the suite.
- Clinicians: a cited correction to a threshold or red-flag rule is the most valuable contribution this project can get. Use the "Clinical correction" issue template.
- Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). You can use, change and host it freely, including commercially. It comes with no warranty.

## Disclaimer

Healthcare.AI helps people keep and understand their own health record. It doesn't diagnose, treat or replace a doctor. In an emergency, call your local emergency number.
