/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          // Sidebar (dark)
          sidebar: '#0f0b2e',
          sidebarLight: '#1a1445',
          sidebarHover: '#231c54',
          // Content area (light)
          bg: '#f4f6fb',
          bgWhite: '#ffffff',
          // Cards
          card: '#ffffff',
          // Brand
          purple: '#7c3aed',
          purpleDark: '#6d28d9',
          purpleLight: '#a78bfa',
          blue: '#3b82f6',
          blueDark: '#2563eb',
          blueLight: '#60a5fa',
          // Text
          text: '#1e293b',
          textSecondary: '#475569',
          muted: '#94a3b8',
          mutedLight: '#cbd5e1',
          // Status
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          // Borders
          border: '#e2e8f0',
          borderLight: '#f1f5f9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.06)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'cardHover': '0 8px 24px rgba(124,58,237,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'glow': '0 0 20px rgba(124,58,237,0.25)',
        'modal': '0 24px 48px rgba(0,0,0,0.2)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.4s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'gradientShift': 'gradientShift 6s ease infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(124,58,237,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(124,58,237,0.4)' },
        },
      },
    },
  },
  plugins: [],
};
