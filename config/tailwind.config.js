/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './client/**/*.{html,js}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
