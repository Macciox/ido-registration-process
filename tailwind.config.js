/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#4338ca',
        },
        secondary: {
          DEFAULT: '#7c3aed',
          dark: '#6d28d9',
        },
      },
    },
  },
  plugins: [],
}