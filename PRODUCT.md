# Product

Healthcare.AI is a personal health record and companion for people living with heart conditions, and for the family members who look after them.

## Platform
Responsive web app (installable PWA later). Phone-first for patients, desktop and phone for caretakers.

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
- Real today: readings with clinical classification and trends, medications, symptoms with rule-based red flags, profile, reports and expiring share links, password and Google sign-in.
- Not built yet: the AI assistant, reminders and caretaker accounts. Copy must not claim them as available.
- Emergency guidance is rule-based and must never depend on AI.
- Accessibility is a requirement, not polish: large legible type, 4.5:1 contrast, keyboard and screen-reader support, reduced motion respected.

## Brand commitments
- Typeface: Atkinson Hyperlegible Next (designed for low-vision readers).
- Heart red is reserved for alerts, emergencies and destructive actions.
