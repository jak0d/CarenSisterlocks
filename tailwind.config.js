/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fce8e6',
          200: '#f9d5d2',
          300: '#f4b5af',
          400: '#ec8a81',
          500: '#e06155',
          600: '#cd4439',
          700: '#ab352c',
          800: '#8d2f28',
          900: '#752c27',
          950: '#3f1410',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d0dbe6',
          300: '#a7bcd1',
          400: '#7898b7',
          500: '#567a9e',
          600: '#436184',
          700: '#374e6b',
          800: '#30435a',
          900: '#2c3a4c',
          950: '#1d2633',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
