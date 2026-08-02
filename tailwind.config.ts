import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#F4F6F8',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#D8DEE6',
          strong: '#A8B4C0',
        },
        text: {
          DEFAULT: '#1A2332',
          secondary: '#5C6B7A',
          muted: '#8B97A6',
        },
        primary: {
          DEFAULT: '#0F2B5B',
          hover: '#0A2045',
        },
        error: {
          DEFAULT: '#C41E24',
          bg: '#FEE2E2',
        },
        brand: '#063327',
        status: {
          onTrack: { bg: '#E8F5EC', border: '#1B7F4B' },
          approaching: { bg: '#FFF8E6', border: '#B86E00' },
          urgent: { bg: '#FEE2E2', border: '#C41E24' },
          blocked: { bg: '#F5F0E6', border: '#8B7355' },
        },
        slot: {
          available: {
            bg: '#E8F4FD',
            bgHover: '#D6EBFA',
            border: '#5B9BD5',
            text: '#0F2B5B',
          },
          booked: { bg: '#ECEFF3', border: '#A8B4C0', text: '#3D4F5F' },
          selected: { bg: '#0F2B5B', border: '#0F2B5B', text: '#FFFFFF' },
          conflict: { bg: '#FEE2E2', border: '#C41E24', text: '#7F1D1D' },
          offHours: { bg: '#F0F2F5', border: '#E2E6EA' },
          line: '#E2E6EA',
        },
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // design_system §3.1 off-hours hatch
        'slot-off-hours':
          'repeating-linear-gradient(-45deg, transparent, transparent 4px, #E2E6EA 4px, #E2E6EA 5px)',
      },
      keyframes: {
        // design_system §8 — slot conflict flash
        'slot-conflict-flash': {
          '0%, 100%': { borderColor: '#C41E24' },
          '50%': { borderColor: '#FEE2E2' },
        },
      },
      animation: {
        'slot-conflict-flash': 'slot-conflict-flash 400ms ease-in-out 2',
      },
    },
  },
  plugins: [],
};

export default config;
