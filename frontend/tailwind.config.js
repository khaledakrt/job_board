/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3f8',
          100: '#d9e6f2',
          200: '#b3cce5',
          300: '#86afd4',
          400: '#5a91c2',
          500: '#0a66c2',
          600: '#0958ab',
          700: '#074484',
          800: '#05315d',
          900: '#031f3b',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffefcf',
          200: '#ffdb9e',
          300: '#ffc166',
          400: '#ffa737',
          500: '#ff9800',
          600: '#e08600',
          700: '#b36a00',
          800: '#8c5400',
          900: '#6b4000',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          500: '#057642',
          600: '#046139',
        },
        danger: {
          500: '#d93025',
          600: '#b3261e',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)',
        elevated: '0 12px 32px rgba(10, 102, 194, 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
