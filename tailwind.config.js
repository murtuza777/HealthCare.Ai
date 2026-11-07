/** @type {import('tailwindcss').Config} */
// "Quiet record" design tokens. See DESIGN.md and docs/design/brief.md.
// Neutral paper, near-black ink, one accent for links and focus, red only for alerts.
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#FAFAF9', // page
        sheet: '#FFFFFF', // inputs, raised surfaces (rare)
        well: '#F3F3F1', // hover rows, skeletons, quiet fills
        line: { DEFAULT: '#E7E7E4', strong: '#D2D2CE' }, // hairlines
        ink: { DEFAULT: '#1C1D1F', muted: '#5C5E63', faint: '#73757A' },
        action: { DEFAULT: '#2952CC', hover: '#1F42A8', soft: '#EDF1FC' }, // links, focus, selection
        danger: { DEFAULT: '#C0172F', hover: '#A0122A', soft: '#FCEEF0' }, // alerts only
        grid: { minor: '#F1F1EE', major: '#E4E4E0' }, // chart rules
        status: {
          normal: '#2E8555',
          borderline: '#B7791F',
          high: '#C4501A',
          low: '#3B6FD4',
        },
      },
      fontFamily: {
        sans: ['"Mona Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.015em' }],
        '3xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '4xl': ['3rem', { lineHeight: '3.125rem', letterSpacing: '-0.025em' }],
        '5xl': ['4rem', { lineHeight: '4rem', letterSpacing: '-0.03em' }],
      },
      borderRadius: { control: '10px', sheet: '14px' },
      boxShadow: {
        sheet: '0 1px 2px rgba(28, 29, 31, 0.04)',
        lift: '0 1px 2px rgba(28, 29, 31, 0.06), 0 12px 32px -12px rgba(28, 29, 31, 0.18)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      maxWidth: { prose: '62ch' },
    },
  },
  plugins: [],
};
