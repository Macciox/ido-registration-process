/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8052F1',
          dark: '#6B46C1',
        },
        secondary: {
          DEFAULT: '#2DDB9C',
          dark: '#059669',
        },
        bg: {
          primary: '#100E22',
          secondary: '#16121F',
          card: '#1A1924',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A18CC0',
          muted: '#8D7FC3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}