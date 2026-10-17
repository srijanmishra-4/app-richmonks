const { BREAKPOINTS } = require('./src/constants/breakpoints');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    screens: {
      sm: `${BREAKPOINTS.sm}px`,
      md: `${BREAKPOINTS.md}px`,
      lg: `${BREAKPOINTS.lg}px`,
      xl: `${BREAKPOINTS.xl}px`,
      '2xl': `${BREAKPOINTS.xxl}px`,
    },
    extend: {},
  },
  plugins: [],
};
