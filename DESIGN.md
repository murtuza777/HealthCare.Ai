---
name: Clinic chart
colors:
  ground: "#F5F8FA"
  sheet: "#FFFFFF"
  well: "#EEF3F7"
  line: "#D6DFE8"
  line-strong: "#B8C6D4"
  ink: "#14305A"
  ink-muted: "#4A5F7A"
  ink-faint: "#6B7F96"
  action: "#1F5FD1"
  action-hover: "#1A4FB0"
  action-soft: "#E6EEFB"
  danger: "#C3122F"
  danger-soft: "#FBE7EA"
  grid-minor: "#F0D8D3"
  grid-major: "#E3B7AF"
  status-normal: { text: "#1E6B45", bg: "#E2F2E9" }
  status-borderline: { text: "#7A4E00", bg: "#FDF0D5" }
  status-high: { text: "#9A3A0A", bg: "#FBE5D9" }
  status-low: { text: "#1A4FA8", bg: "#E3ECFB" }
typography:
  family: "Atkinson Hyperlegible Next (variable, self-hosted)"
  base: "17px / 1.65"
  scale: [13, 15, 17, 20, 24, 30, 36, 48, 60]
  numerals: "tabular-nums for every reading (.figures)"
rounded:
  control: 8px
  sheet: 12px
  chip: 9999px
---

# Clinic chart

Healthcare.AI looks like a cardiology clinic's own chart: precise, quiet and trustworthy. Readings are set like measurements, not decorated. Source of truth for values: `tailwind.config.js` and `src/client/styles/globals.css`.

## Colour
- **Restrained strategy.** Porcelain ground, white sheets, prescription-ink blue for text and actions.
- **Action blue** is for primary actions, links, current navigation and focus. It never decorates.
- **Heart red is reserved** for emergencies, alerts, form errors and destructive actions. Decorative icons are `ink-faint`, never red.
- **Status always has a word** ("Normal", "High", "Emergency range"), never colour alone.
- **ECG paper grid** (`.ecg-grid`) appears only behind charts. It is the system's signature; don't use it as a page background or ornament.
- Light theme only: patients log readings at home in daylight on phones.

## Type
- One family, Atkinson Hyperlegible Next, chosen for low-vision readers. Its slashed zero is intentional.
- Fixed rem scale (~1.2), 17px body. Headings bold with slight negative tracking and balanced wrapping.
- Readings use `.figures` (tabular, lining) at large sizes (24px+ in tables).
- Sentence case everywhere. No all-caps labels, no eyebrow labels above headings, no dot-joined meta strings.

## Components (src/client/components/ui.tsx)
- **Card (sheet):** white, 1px `line` border, 12px radius, soft offset shadow. `flush` for edge-to-edge tables. Never nest cards.
- **Buttons:** 44px min height (36px small), 8px radius, semibold. Variants: primary, secondary, ghost, danger (emergencies), danger-quiet (delete, revoke).
- **Fields:** label above (semibold 15px), 44px inputs, 2px action focus ring, hint below in muted ink.
- **Chips** (toggle groups): rounded-full, selected = solid action blue; hidden inputs show a focus ring on the chip.
- **StatusBadge**, **EmptyState** (left-aligned, teaches the next step), **Loading** (skeleton lines, never spinners mid-content), **Notice**.
- **TrendChart:** ink trace on ECG paper; blood pressure is systolic solid and diastolic dashed, with a legend.

## Layout
- Max width 72rem (`max-w-6xl`), 16–24px gutters.
- App: sticky top bar with tabs on ≥768px; a bottom tab bar with icon and label on phones. Emergency is always one tap away.
- Overview leads with a "latest readings" table (measure, reading, status, taken), not a grid of identical metric cards.
- Auth: form column plus a quiet reassurance panel on wide screens.

## Motion
- One authored moment: the landing chart trace sweeps across the grid once (`.trace-draw`, clip reveal, 1.8s ease-out).
- Product screens have no entrance animation; transitions are 150–300ms on state changes only.
- `prefers-reduced-motion` disables all of it.

## Browser surfaces
Selection, caret, focus ring, scrollbar colour, placeholder and dialog backdrop are themed from the palette in `globals.css`.

## Don't
Glass or blur as decoration, gradients, gradient text, glowing edges, emoji as icons, hero-metric templates, identical icon cards, red for decoration, modals where inline works.
