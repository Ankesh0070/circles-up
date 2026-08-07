/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2196D6',
          deep: '#1976C2',
          amber: '#4FB5E8',
          sage: '#4A7C59',
          ink: '#1F1B17',
          cream: '#FAFAFA',
          indigo: '#0E5A8A',
        },
        heart: '#C8232C',
        sos: '#FF0033',
      },
    },
  },
  plugins: [],
};
