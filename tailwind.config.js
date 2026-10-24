/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#121212',
        gold: '#D4AF37',
        'gold-light': '#F3E5AB',
      },
    },
  },
  plugins: [],
}
