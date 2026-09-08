/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'sans-serif'], display: ['Space Grotesk', 'ui-sans-serif', 'sans-serif'] },
      boxShadow: { glow: '0 0 40px rgba(71, 107, 255, 0.18)' },
    },
  },
  plugins: [],
}
