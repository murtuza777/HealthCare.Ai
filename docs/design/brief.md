# Surface brief: whole app (landing, sign-in, signed-in app)

Development-only. Never copy into source or anything served to the browser.

Scope: landing (Persuade), sign-in and sign-up screens (Operate), signed-in app and share page (Operate).

## Direction contract

THESIS: A quiet record, set like a well-made printed document: generous space, a light serif for what matters, plain sans for everything else, near-black ink on neutral paper. Revision 2 (Nov 2026) replaces the Clinic chart look, which the user judged still "AI slop": card-on-grey layouts, bold navy headings, blue primary buttons, pastel pills and icon rows. References studied: Function Health (light serif display, warm restraint), Oura (editorial serif, muted text), Linear (tight tracking, quiet secondary text, ink primary).

OWN-WORLD: Neutral paper (#FAFAF9), near-black ink (#1C1D1F), muted #5C5E63, hairlines #E7E7E4. One accent blue (#2952CC) only for focus and selection. Red (#C0172F) only for emergencies and alerts. Source Serif 4 at weight 300-400 for headings and big readings; Mona Sans for UI. Pill buttons in ink that press (scale 0.97). Status is a dot and a word. Sections separated by space and hairlines; only forms are boxed. Charts are a fine ink trace over faint rules aligned to the ticks.

STORY: A patient sees at a glance what their latest readings are and whether any need attention, logs a new one in seconds, and trusts that the record is exact enough to show a doctor. A caretaker understands the situation in one screen.

FIRST VIEWPORT: Landing: a large light serif headline, one sentence, an ink pill and a quiet text action; below, an unboxed 30-day blood pressure chart with the latest reading set large in the serif, labelled as sample data. App overview: serif greeting and date, then an unboxed latest-readings table.

FORM: Quiet record (revision 2). Revision 1 was Clinic chart, chosen from four directions (pill organizer, health diary, clinic chart, platform standard).

SIGNATURE INTERACTION: On the landing chart, the trace draws once on first view (reduced-motion: static). In the app, logging a reading shows its classification before saving and the new point lands on the chart.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
