---
name: Quiet record
colors:
  ground: "#FAFAF9"
  sheet: "#FFFFFF"
  well: "#F3F3F1"
  line: "#E7E7E4"
  line-strong: "#D2D2CE"
  ink: "#1C1D1F"
  ink-muted: "#5C5E63"
  ink-faint: "#73757A"
  accent: "#2952CC" # focus and selection only (token name: action)
  danger: "#C0172F"
  danger-soft: "#FCEEF0"
  status-dots: { normal: "#2E8555", borderline: "#B7791F", high: "#C4501A", low: "#3B6FD4" }
typography:
  display: "Source Serif 4 Variable (optical sizes), weight 300-400"
  text: "Mona Sans Variable, body weight 420, emphasis 540-560"
  base: "16px / 1.625"
  scale: [13, 14, 16, 18, 22, 28, 36, 48, 64]
  numerals: "tabular figures (.figures); large readings in the serif (.reading)"
rounded:
  control: 10px
  sheet: 14px
  button: 9999px
---

# Quiet record

Healthcare.AI reads like a well-made printed record: generous space, a light serif for what matters, plain sans for everything else, near-black ink on neutral paper. Source of truth for values: `tailwind.config.js` and `src/client/styles/globals.css`. Direction and history: `docs/design/brief.md`.

## Colour
- **Ink does the work.** Text, primary buttons, selected chips and the chart trace are near-black ink. Muted and faint inks carry secondary text.
- **No brand blue on surfaces.** The accent appears only as the focus ring and text selection.
- **Red is for alerts only:** the Emergency control (an outlined pill), the critical banner, the emergency dialog's call button and form errors. Delete buttons are quiet and turn red on hover.
- **Status is a dot and a word** ("Normal", "High"), muted text. Only "Emergency range" raises its voice: red, semibold.
- Light theme only.

## Type
- **Headings** (`h1`, `h2`) are Source Serif 4 at weight 300-400 with optical sizing; size carries hierarchy, not weight. `h3` is Mona Sans at 560.
- **Body** is Mona Sans at 420. Emphasis is 540-560; nothing is bold.
- **Readings** that matter use `.reading` (serif, tabular, tight tracking) with the unit set small in sans beside it. Columns of numbers use `.figures`.
- Sentence case everywhere. No eyebrow labels, no all caps, no dot-joined meta strings.

## Components (src/client/components/ui.tsx)
- **Card:** plain by default (no box: sections are separated by space). `boxed` draws a white bordered surface for things that must read as one object, which in practice means forms. `flush` is boxed without padding. Never nest boxes.
- **Buttons:** pills. Primary ink, secondary outlined, ghost text. `active:scale-[0.97]`, 150ms ease-out on specific properties.
- **Fields:** label above at 540, 44px inputs, ink border and a soft ink halo on focus.
- **Chips** (toggle groups): pills; selected is solid ink.
- **Lists and tables:** hairline rules between rows and above/below the set; no row icons.
- **EmptyState** is text only and teaches the next step. **Loading** is skeleton lines. **Notice** is a quiet well with a coloured dot.
- **Charts:** a 1.75px ink trace (diastolic: dashed grey) over faint horizontal rules aligned to the ticks; no dots, no box.

## Layout
- Content width 64rem (`max-w-5xl`), 20-32px gutters. Sections 56px apart (`space-y-14`).
- App: a translucent top bar with text tabs (the current one sits on a faint ink pill) on wide screens; a bottom tab bar on phones. Emergency is always one tap away.
- Auth: one centred 400px column, no side panel.

## Motion
- Page content settles once on navigation (`.settle`: 6px rise and fade, 360ms, ease-out).
- The landing chart's trace draws in once (`.trace-draw`).
- Buttons press. Nothing else moves. `prefers-reduced-motion` disables all of it.

## Don't
Cards on grey as the default layout, bold headings, blue primary buttons, filled pastel status pills, icons beside every row, gradients, glass as decoration, glows, emoji, eyebrow labels, hero-metric templates, identical icon cards, red for anything but alerts.
