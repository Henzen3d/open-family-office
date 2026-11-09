/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FE',
          400: '#7c8cf8',
          500: '#5B67F6',
          600: '#4F5BE2',
          700: '#3F48CC',
        },
        surface: {
          DEFAULT: '#0d131f',
          card: '#161c28',
          container: '#1a202c',
          elevated: '#212a3d',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        lightSurface: {
          DEFAULT: '#F4F6FB',
          card: '#FFFFFF',
          container: '#F8FAFC',
          elevated: '#EEF2FF',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 10px 30px -5px rgba(24, 39, 75, 0.05), 0 4px 12px -2px rgba(24, 39, 75, 0.02)',
        'card-dark': '0 12px 36px -4px rgba(0, 0, 0, 0.45), 0 4px 14px -2px rgba(0, 0, 0, 0.3)',
        pill: '0 4px 14px -2px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
