import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'heartbeat': 'heartbeat 0.857s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'valve': 'valve 0.857s ease-in-out infinite',
        'flow': 'flow 2s linear infinite',
        'ecg-1': 'ecg-slide 3.428s linear infinite',
        'ecg-2': 'ecg-slide 3.428s linear infinite -1.143s',
        'ecg-3': 'ecg-slide 3.428s linear infinite -2.286s',
        'pulse-flow': 'pulse-flow 0.857s ease-in-out infinite',
        'muscle-contract': 'muscle-contract 0.857s ease-in-out infinite',
        'label-fade': 'label-fade 0.857s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '15%': { transform: 'scale(1.05) rotate(-1deg)' },
          '30%': { transform: 'scale(1) rotate(0deg)' },
          '45%': { transform: 'scale(1.07) rotate(1deg)' },
          '60%': { transform: 'scale(1) rotate(0deg)' },
        },
        valve: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '15%, 45%': { transform: 'scaleY(0.7)' },
        },
        flow: {
          '0%': { strokeDashoffset: '200' },
          '100%': { strokeDashoffset: '0' },
        },
        'ecg-slide': {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-171.4px)' },
        },
        'pulse-flow': {
          '0%, 100%': {
            opacity: '0.8',
            strokeWidth: 'var(--stroke-width, 1)',
          },
          '50%': {
            opacity: '1',
            strokeWidth: 'calc(var(--stroke-width, 1) * 1.2)',
          },
        },
        'muscle-contract': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.5',
          },
          '15%, 45%': {
            transform: 'scale(0.98)',
            opacity: '0.7',
          },
        },
        'label-fade': {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
