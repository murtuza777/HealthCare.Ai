/** @type {import('tailwindcss').Config} */
// Clinic chart design tokens. See docs/design/brief.md and DESIGN.md.
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#F5F8FA', // porcelain page ground
        sheet: '#FFFFFF', // chart sheets, inputs
        well: '#EEF3F7', // second neutral layer: table heads, sidebars
        line: { DEFAULT: '#D6DFE8', strong: '#B8C6D4' },
        ink: { DEFAULT: '#14305A', muted: '#4A5F7A', faint: '#6B7F96' },
        action: { DEFAULT: '#1F5FD1', hover: '#1A4FB0', soft: '#E6EEFB' },
        danger: { DEFAULT: '#C3122F', hover: '#A20F27', soft: '#FBE7EA' },
        grid: { minor: '#F0D8D3', major: '#E3B7AF' }, // ECG paper, charts only
        status: {
          normal: '#1E6B45',
          'normal-bg': '#E2F2E9',
          borderline: '#7A4E00',
          'borderline-bg': '#FDF0D5',
          high: '#9A3A0A',
          'high-bg': '#FBE5D9',
          low: '#1A4FA8',
          'low-bg': '#E3ECFB',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fixed rem scale (~1.2 ratio) with a 17px base for older eyes.
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.875rem', { lineHeight: '2.375rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '4xl': ['3rem', { lineHeight: '3.25rem' }],
        '5xl': ['3.75rem', { lineHeight: '3.9rem' }],
      },
      borderRadius: { control: '8px', sheet: '12px' },
      boxShadow: {
        sheet: '0 1px 2px rgba(20, 48, 90, 0.06), 0 4px 12px -6px rgba(20, 48, 90, 0.10)',
        lift: '0 2px 4px rgba(20, 48, 90, 0.08), 0 12px 28px -12px rgba(20, 48, 90, 0.22)',
      },
      maxWidth: { prose: '68ch' },
    },
  },
  plugins: [],
};
