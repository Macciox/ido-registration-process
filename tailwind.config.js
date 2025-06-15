/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Indigo
          dark: '#4F46E5',
        },
        secondary: {
          DEFAULT: '#8B5CF6', // Purple for Decubate branding
          dark: '#7C3AED',
        },
      },
    },
  },
  plugins: [],
}