# Healthcare.AI

An advanced health monitoring and management platform powered by AI for early disease detection and patient health management.

> **Planning docs:** [Product Requirements (PRD)](docs/PRD.md) · [Technical Implementation Plan](docs/TECH_PLAN.md)

## Key Features

1. **Patient Overview Dashboard**
   - Track and visualize vital health metrics
   - Receive personalized health insights and advice based on your data
   - Monitor trends and changes in your health status
   - Input and manage health data including vitals, conditions, and medications

2. **Health Guardian AI Assistant**
   - Advanced AI-powered medical assistant that can answer ANY healthcare question
   - Comprehensive knowledge of medical conditions, treatments, and terminology
   - Personalized health advice based on patient data and health metrics
   - Medication guidance, symptom assessment, and early disease detection
   - Being rebuilt on the new API (Phase 2)

3. **Reports Management System**
   - Securely store medical reports and test results
   - Share reports with healthcare providers via QR codes
   - Scan and digitize paper reports
   - Manage patient identification and secure sharing

4. **Caretaker Management**
   - Set up reminders for medications, exercises, and appointments
   - Assign and manage caretakers for patient monitoring
   - Configure notifications for health events
   - Coordinate care among multiple care providers

5. **Health Timeline**
   - Comprehensive view of health history and events
   - Filter and search through past health records
   - Track interactions with healthcare system
   - Identify patterns and trends in health data

## Tech Stack

Runs entirely on Cloudflare's free plan (see [docs/TECH_PLAN.md](docs/TECH_PLAN.md) for why).

- **Frontend:** Vite + React 19 single-page app, React Router, TanStack Query, Tailwind CSS, Framer Motion, Recharts, Lucide icons
- **API:** Hono on Cloudflare Workers, typed end to end (the browser client gets its types from the API)
- **Data:** Cloudflare D1 (SQLite) with Drizzle ORM and migrations
- **Auth:** Better Auth, passwordless (6-digit email code), optional Google sign-in
- **Email:** Resend, through an outbox table that retries failed sends
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

Without `RESEND_API_KEY`, sign-in codes aren't emailed; read the latest one from the local outbox:

```bash
npx wrangler d1 execute DB --local --command "SELECT recipient, payload FROM outbox ORDER BY created_at DESC LIMIT 1"
```

Checks:

```bash
npm run check    # typecheck, lint, tests, build
```

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
legacy/          The previous Next.js + Supabase app, being ported screen by screen
```

Security notes:
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
