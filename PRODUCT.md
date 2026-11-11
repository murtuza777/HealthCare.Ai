# Product

Healthcare.AI is a personal health record and companion for people living with heart conditions, and for the family members who look after them.

## Platform
Responsive web app, installable as a PWA. Phone-first for patients, desktop and phone for caretakers.

## Stack
Vite + React SPA served from Cloudflare Workers static assets; Hono API on Workers; D1, R2. See docs/TECH_PLAN.md.

## Users
- **Patients, mostly 50–75**, after a heart attack or with hypertension, heart failure or atrial fibrillation. Comfortable with a phone, not with dense software. Many have reduced near vision.
- **Caretakers**, usually adult children, often in another city, checking in between work.
- **Doctors**, who only see what a patient shares through a time-limited link.

## Product purpose
Keep one trustworthy record of readings, medicines, symptoms and reports; make it obvious when something needs attention; make sharing with a doctor effortless.

## Positioning
A calm, precise record a cardiologist would respect, not a wellness gadget. Clarity and trust over excitement.

## Operating context
Readings are logged at home right after measuring, morning and evening, usually on a phone in daylight. Emergencies are rare but must be impossible to miss.

## Capabilities and constraints
- Real today: readings with clinical classification, trends and CSV import; medicines with reminders and adherence; symptoms with rule-based red flags; reports with values read from uploads and expiring share links; caretaker accounts with alerts and quiet hours; a daily rule-based trend review; appointments; the AI assistant; the visit summary; history; export and deletion.
- Not built yet: refill reminders, repeating reminders, device sync, languages other than English. Copy must not claim them as available.
- AI answers questions, suggests visit questions and transcribes report values. It never decides emergencies, out-of-range flags or what is saved.
- Emergency guidance is rule-based and must never depend on AI.
- Accessibility is a requirement, not polish: large legible type, 4.5:1 contrast, keyboard and screen-reader support, reduced motion respected.

## Brand commitments
- Type: Source Serif 4 (light) for headings and large readings, Mona Sans for everything else. Body never below 16px.
- Red is reserved for alerts and emergencies. Primary actions are near-black ink, never a brand blue.
