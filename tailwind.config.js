/** @type {import('tailwindcss').Config} */
export default {
  // dark: styles follow the site's own Light/Dark switch, not the computer's setting
  darkMode: 'class',
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
