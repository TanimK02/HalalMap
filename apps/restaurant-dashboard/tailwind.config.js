/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F7A5C',
        secondary: '#3ECF8E',
        background: '#F7F7F5',
        surface: '#FFFFFF',
        'text-primary': '#1F2933',
        'text-secondary': '#6B7280',
        accent: '#F59E0B',
      },
    },
  },
  plugins: [],
};
