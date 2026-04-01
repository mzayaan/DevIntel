/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../src/**/*.{html,js}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
}
