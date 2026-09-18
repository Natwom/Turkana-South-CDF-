// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { brand: { DEFAULT: '#1a5c2e', light: '#e8f5ec', dark: '#0f3d1e' } } } },
  plugins: []
}