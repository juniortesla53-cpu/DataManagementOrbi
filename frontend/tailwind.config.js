/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orbi: {
          bg: '#0f172a',
          card: '#1e293b',
          nav: '#162032',
          primary: '#1e3a5f',
          accent: '#3b82f6',
          text: '#f1f5f9',
          muted: '#94a3b8',
          success: '#22c55e',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
