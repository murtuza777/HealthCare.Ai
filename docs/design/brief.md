# Surface brief: whole app (landing, sign-in, signed-in app)

Development-only. Never copy into source or anything served to the browser.

Scope: landing (Persuade), sign-in and sign-up screens (Operate), signed-in app and share page (Operate).

## Direction contract

THESIS: The record looks like a cardiology clinic's own chart: precise, quiet and trustworthy, with readings set like measurements, not decorated like a fitness app. It refuses the dark glass-and-gradient health template and the identical-card dashboard.

OWN-WORLD: Cool porcelain ground (#F5F8FA), white chart sheets with hairline rules (#D6DFE8), prescription-ink blue text (#14305A) and actions (#1F5FD1). A faint ECG-paper millimetre grid (#F0D8D3 minor, #E3B7AF major) appears only behind charts, where the trace is drawn in ink. Heart red (#C3122F) only for emergencies and alerts. Atkinson Hyperlegible Next everywhere; readings in tabular figures at generous size. Corners: 8px controls, 12px sheets. No glass, no gradients, no entrance animation.

STORY: A patient sees at a glance what their latest readings are and whether any need attention, logs a new one in seconds, and trusts that the record is exact enough to show a doctor. A caretaker understands the situation in one screen.

FIRST VIEWPORT: Landing: left-aligned headline and one sentence with two actions (create account, sign in); beside it a chart sheet showing 30 days of blood pressure on ECG grid with a classified latest reading, labelled as sample data. App overview: greeting and date, then a "latest readings" chart table (measure, value, status, when) with the log-a-reading action in the top bar.

FORM: Clinic chart, chosen by the user from four directions (pill organizer, health diary, clinic chart, platform standard). Seed: none (unavailable; impeccable launcher not installed).

SIGNATURE INTERACTION: On the landing chart, the trace draws once across the grid on first view (reduced-motion: static). In the app, logging a reading shows its classification before saving and the new point lands on the chart.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
