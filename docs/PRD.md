# Healthcare.AI — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v1.1 (login is passwordless after the Phase 1 spikes) |
| **Owner** | Murtuza |
| **Last updated** | 2026-11-05 |
| **Companion doc** | [Technical Implementation Plan](./TECH_PLAN.md) |

---

## 1. Summary

Healthcare.AI is a personal health companion for **people living with heart conditions and the family members who care for them**. It keeps a patient's vitals, medications, symptoms and medical reports in one place, lets them share records with a doctor through a QR code, and adds an AI assistant ("Health Guardian") that understands the patient's own data. It reminds them about medications and appointments, and warns caretakers when something looks wrong.

The UI exists and much of the experience is designed. This PRD defines what "complete" means: real persistence for every feature, working notifications, a safe AI assistant that can take actions through tools, and a deployable, secure product on Cloudflare's free tier.

## 2. Problem

Cardiac patients manage a lot at once: several medications on strict schedules, regular BP and heart-rate checks, lab reports from different clinics, and symptoms that may or may not be urgent. Today this lives in paper files, phone photos and memory.

- **Patients** forget doses, can't tell whether a reading is worrying, and arrive at appointments without their history.
- **Caretakers** (often adult children living elsewhere) have no visibility until something goes wrong.
- **Doctors** see a fragment of the picture: whatever the patient remembers to bring.

General-purpose chatbots can explain medical terms but know nothing about the patient, can't act, and may answer an emergency with an essay.

## 3. Goals and non-goals

### Goals
1. **One record per patient**: vitals, medications, symptoms, conditions and reports in a single timeline.
2. **Fewer missed doses**: reliable reminders with adherence tracking and caretaker escalation.
3. **Earlier warning**: detect concerning readings or symptom patterns and alert the right person.
4. **Better appointments**: share reports instantly by QR and generate a one-page visit summary.
5. **A grounded, safe AI assistant** that answers from the patient's own data, takes simple actions, and always routes emergencies to emergency services.
6. **Run at near-zero cost** until there are real users (Cloudflare free tier).

### Non-goals (for now)
- Diagnosing disease or prescribing/changing medication. The AI informs; clinicians decide.
- A doctor-side clinical portal or EHR integration (FHIR/HL7). Doctors get read-only shared links only.
- Native mobile apps. The web app is responsive and installable (PWA).
- Direct wearable/device integrations (Apple Health, Fitbit, BLE cuffs). Planned for later.
- Telemedicine, video calls, payments or insurance.

## 4. Users and personas

| Persona | Description | Primary needs |
|---|---|---|
| **Patient — "Rahim, 62"** | Had a heart attack two years ago. On 4 medications. Moderately comfortable with a smartphone. | Simple logging, dose reminders, "is this reading OK?", reports in one place. |
| **Caretaker — "Sara, 34"** | Rahim's daughter, lives in another city. | Know he took his meds, get alerted on bad readings or missed doses, see trends. |
| **Doctor — "Dr. Mehta"** | Cardiologist with 10 minutes per appointment. | Quickly see recent reports, vitals trend and current meds without an account. |
| **Self-tracker — "Ayesha, 41"** | Hypertension, family history of heart disease. | Track BP trends, understand risk, lifestyle guidance. |

## 5. Product scope by release

| Release | Theme | Contents |
|---|---|---|
| **MVP (R1)** | "My health record, for real" | Accounts, health profile, vitals, medications, symptoms, report upload and QR sharing, dashboard and timeline, AI chat grounded in the patient's data, basic emergency guidance. |
| **R2** | "Never miss a dose" | Medication reminders with adherence tracking, caretaker invites and roles, notifications (email and web push), caretaker escalation on missed doses or abnormal readings. |
| **R3** | "An assistant that acts" | Tool-using AI agent, report reader (extract lab values from PDF/photo), proactive monitoring, visit-prep summary, conversation memory. |
| **R4** | "Ready for more users" | Hardening, audit log, data export and account deletion, observability, performance, compliance review, optional move to paid tiers or AWS. |

## 6. Functional requirements

Priority: **P0** = required for that release, **P1** = should have, **P2** = nice to have.

### 6.1 Accounts and onboarding (R1)
| ID | Requirement | Priority |
|---|---|---|
| A-1 | Passwordless sign-up and log in with a 6-digit code sent by email (codes expire after 5 minutes, limited attempts). No passwords to remember or reset. | P0 |
| A-2 | Google sign-in. | P1 |
| A-3 | Onboarding wizard collects the health profile: age, sex, height, weight, conditions, cardiac history (heart condition, past heart attack and date), allergies, family history, lifestyle (smoking, alcohol, exercise, diet, stress). | P0 |
| A-4 | Protected pages require a session. Unauthenticated API calls return 401. | P0 |
| A-5 | User can export all their data (JSON + report files) and delete their account permanently. | P0 (R4) |

**Acceptance:** a new user can sign up, verify email, complete onboarding and land on a dashboard populated from their own profile. Nothing is mock data.

### 6.2 Health data (R1)
| ID | Requirement | Priority |
|---|---|---|
| H-1 | Log vitals: heart rate, blood pressure (systolic/diastolic), SpO₂, weight, blood glucose, temperature, cholesterol. Each has a timestamp and an optional note. | P0 |
| H-2 | Each reading is classified (normal / borderline / high / critical) using documented clinical thresholds, shown with colour and plain-language text. | P0 |
| H-3 | Trend charts per vital (7 / 30 / 90 days). | P0 |
| H-4 | Manage medications: name, dose, frequency, times of day, start/end date, instructions. | P0 |
| H-5 | Log symptoms: type, severity (1–10), duration, accompanying symptoms, notes. | P0 |
| H-6 | Health timeline: every reading, symptom, dose, report and alert in one filterable feed. | P0 |
| H-7 | Cardiac risk snapshot from profile and latest vitals, with factors explained. Marked as an estimate, not a diagnosis. | P1 |
| H-8 | Bulk import vitals from CSV. | P2 |

### 6.3 Medical reports and sharing (R1)
| ID | Requirement | Priority |
|---|---|---|
| R-1 | Upload reports (PDF, JPG, PNG; max 10 MB) with type, date, doctor, facility and notes. | P0 |
| R-2 | Gallery with search and filter by type and date; view and download. | P0 |
| R-3 | Create a share link + QR code for one or more reports, with an expiry (1 h, 24 h, 7 d) and optional "include vitals summary". | P0 |
| R-4 | The recipient opens the link without an account, read-only. Expired or revoked links show a clear message. | P0 |
| R-5 | Patient can see active shares, how many times each was opened, and revoke any. | P0 |
| R-6 | Scan a QR code in-app to open a shared record. | P1 |

### 6.4 Medications, reminders and adherence (R2)
| ID | Requirement | Priority |
|---|---|---|
| M-1 | Reminders are generated automatically from the medication schedule. Appointment and custom reminders can be added manually. | P0 |
| M-2 | A notification is delivered at the scheduled time (web push; email fallback). | P0 |
| M-3 | Patient marks a dose taken / skipped / snoozed from the notification or the app. | P0 |
| M-4 | Adherence % per medication and overall, by week. | P0 |
| M-5 | A dose not confirmed within a configurable window (default 60 min) counts as missed and notifies the caretakers who opted in. | P0 |
| M-6 | Refill reminder when remaining pill count is low. | P2 |

### 6.5 Caretakers (R2)
| ID | Requirement | Priority |
|---|---|---|
| C-1 | Patient invites a caretaker by email. The caretaker creates an account (or logs in) and accepts. | P0 |
| C-2 | Patient picks each caretaker's permissions: view vitals, view meds and adherence, view reports, receive alerts. | P0 |
| C-3 | Caretaker has a dashboard listing the patients they care for, with status at a glance. | P0 |
| C-4 | Patient can remove a caretaker at any time; access ends immediately. | P0 |
| C-5 | Caretaker chooses alert channels and quiet hours. | P1 |

### 6.6 Alerts and emergencies (R1 basic, R2 full)
| ID | Requirement | Priority |
|---|---|---|
| E-1 | A **critical** vital (e.g. BP ≥ 180/120, HR < 40 or > 130 at rest, SpO₂ < 90%) or a red-flag symptom combination (chest pain with shortness of breath, sweating, or arm/jaw pain; sudden one-sided weakness; fainting) shows a full-screen emergency banner with a one-tap call to the local emergency number. | P0 |
| E-2 | Red-flag detection is **rule-based and runs before any AI call**. It must not depend on the LLM being available. | P0 |
| E-3 | Critical events notify opted-in caretakers immediately. | P0 (R2) |
| E-4 | Patient sets their country (for the emergency number) and an emergency contact. | P0 |

### 6.7 Health Guardian AI assistant
| ID | Requirement | Release | Priority |
|---|---|---|---|
| AI-1 | Chat that answers health questions using the patient's profile, recent vitals, meds, symptoms and report summaries as context. | R1 | P0 |
| AI-2 | Responses stream token by token. | R1 | P0 |
| AI-3 | Every answer that touches symptoms ends with clear "when to seek care" guidance. The assistant never claims to be a doctor, diagnose with certainty, or tell users to start, stop or change a medication. | R1 | P0 |
| AI-4 | Conversation history persists across sessions. | R1 | P1 |
| AI-5 | **Tools**: the assistant can read the patient's data (vitals, trends, meds, adherence, reports) and propose actions: log a symptom, log a vital, create a reminder, notify a caretaker. Actions that write data or contact someone require the user to confirm. | R3 | P0 |
| AI-6 | **Report reader**: on upload, extract structured lab values (test, value, unit, reference range), flag out-of-range results and write a plain-language summary. The user can correct extracted values. | R3 | P0 |
| AI-7 | **Monitoring agent**: daily job reviews new data against the patient's baseline (e.g. BP trending up over 2 weeks, adherence dropping) and posts an insight; serious findings notify caretakers. | R3 | P1 |
| AI-8 | **Visit prep**: one-page PDF summary for an upcoming appointment (current meds, adherence, vitals trends, new symptoms, recent reports, questions to ask). | R3 | P1 |
| AI-9 | If the AI provider fails, the user sees an honest "assistant unavailable" message plus rule-based guidance, never a fabricated answer. | R1 | P0 |
| AI-10 | Usage limits per user per day to control cost. | R1 | P0 |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy** | Health data is sensitive personal data. Each user's data is visible only to them and to caretakers they explicitly authorise. No data is sold or used for advertising. A privacy policy and in-app consent are shown at sign-up, and consent is recorded. |
| **AI data handling** | Only the minimum necessary context is sent to the LLM. Use API tiers that don't train on submitted data where available. Disclose in the privacy policy which AI provider processes data. |
| **Security** | No secrets in the repo or client bundle. All input validated server-side. Authorization checked on every data access (the database has no row-level security). Share tokens are random, stored hashed, expire, and can be revoked. Rate limiting on auth, AI and share endpoints. Security headers on all responses. |
| **Compliance** | Design toward HIPAA (US), GDPR (EU) and India's DPDP Act principles: consent, purpose limitation, access/export/deletion rights, breach-ready audit log. A formal compliance review is needed before marketing to a specific region (R4). |
| **Medical safety** | Disclaimers in onboarding and chat. Emergency detection is deterministic and tested. Clinical thresholds are documented with sources and reviewed by a clinician before launch. |
| **Performance** | Dashboard interactive in < 2.5 s on 4G. API p95 < 300 ms excluding AI. First AI token < 2 s. |
| **Availability** | 99.5% target on Cloudflare free tier. Reminders deliver within 2 minutes of schedule. |
| **Accessibility** | WCAG 2.1 AA: large touch targets and readable font sizes (older users), keyboard navigation, screen-reader labels, sufficient contrast, not colour-only status indicators. |
| **Devices** | Responsive from 360 px wide. Installable PWA for push notifications. |
| **Cost** | Runs on free tiers until roughly 100 active users. Per-user AI cost is capped. |

## 8. Success metrics

| Metric | Target (3 months after R2) |
|---|---|
| Activation: new users who log ≥ 3 vitals in their first week | ≥ 50% |
| Weekly active patients / total patients | ≥ 40% |
| Medication adherence among users with reminders on | ≥ 85% |
| Reminder delivery success | ≥ 99% |
| Patients with at least one caretaker connected | ≥ 30% |
| AI answers rated helpful (thumbs up) | ≥ 80% |
| Emergency red-flag detection on the test suite | 100% recall |
| Critical security incidents | 0 |

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI gives harmful or wrong medical advice | High | Strict system prompt, rule-based red-flag layer before the AI, no medication-change advice, grounding in user data, evaluation set of risky prompts run in CI, thumbs-down feedback review. |
| Missed emergency | High | Deterministic thresholds, 100%-recall test suite, emergency UI that works offline from cached rules. |
| Data breach or cross-user data leak | High | Single data-access layer that always scopes by user and permission, tests for authorization, hashed share tokens, audit log. |
| Notification fatigue | Medium | Quiet hours, per-channel settings, digest mode for non-critical insights. |
| Free-tier limits hit (AI quota, Workers CPU) | Medium | Architecture built for the 10 ms CPU limit (static SPA + small API, passwordless login; measured in spikes). Per-user AI limits, caching, AI Gateway. Upgrade to Workers Paid ($5/mo) with no code change when needed. |
| Regulatory exposure | Medium | Position as a wellness and self-management tool, not a medical device; legal review before launch in a regulated market. |

## 10. Open questions
1. Primary launch market (India, US, other)? This decides the compliance regime, emergency numbers, units (mg/dL vs mmol/L) and SMS provider.
2. Is SMS or WhatsApp delivery needed in R2, or are web push and email enough? (SMS costs money.)
3. Which LLM provider for production: stay on Gemini's free tier, or a paid model (e.g. Claude) for higher quality and a data-processing agreement?
4. Does a clinician advisor review thresholds, red-flag rules and prompts?
5. Should caretakers be able to log readings on the patient's behalf?
