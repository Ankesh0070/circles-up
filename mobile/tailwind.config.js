/** @type {import('tailwindcss').Config} */
// Keep in sync with src/shared/theme/tokens.ts (Stitch design system).
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Semantic names matching the design system.
        primary: { DEFAULT: '#006290', bright: '#007CB4' },
        secondary: { DEFAULT: '#8127CF', bright: '#9C48EA' },
        tertiary: '#B10E6B',
        canvas: '#F6F9FF',
        surface: { DEFAULT: '#FFFFFF', low: '#F0F4F9', container: '#EBEEF4', variant: '#DFE3E8' },
        ink: { DEFAULT: '#181C20', muted: '#6F7881' },
        outline: { DEFAULT: '#6F7881', variant: '#BEC7D1' },
        // Legacy aliases, re-pointed at the new palette so existing
        // `brand-*` classes render the new design instead of the old blue.
        brand: {
          primary: '#006290',
          deep: '#8127CF',
          amber: '#007CB4',
          sage: '#10B981',
          ink: '#181C20',
          cream: '#F6F9FF',
          indigo: '#006290',
        },
        heart: '#B10E6B',
        sos: '#FF0033',
      },
      borderRadius: {
        card: '16px',
        hero: '24px',
      },
    },
  },
  plugins: [],
};
