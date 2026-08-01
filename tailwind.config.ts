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
          available: { bg: '#E8F4FD', border: '#5B9BD5' },
          booked: { bg: '#ECEFF3', border: '#A8B4C0' },
          selected: { bg: '#0F2B5B', text: '#FFFFFF' },
        },
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
