/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#1e243d',
          100: '#2b3459',
          400: '#7c8cf8',
          500: '#6366f1',
          600: '#5254e0',
          700: '#4345c2',
        },
        surface: {
          DEFAULT: '#0d131f',
          card: '#161c28',
          container: '#1a202c',
          elevated: '#212a3d',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 12px 36px -4px rgba(0, 0, 0, 0.45), 0 4px 14px -2px rgba(0, 0, 0, 0.3)',
        pill: '0 8px 24px -4px rgba(99, 102, 241, 0.45)',
      },
    },
  },
  plugins: [],
};
