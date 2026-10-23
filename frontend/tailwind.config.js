/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        // Deep space dark palette
        space: {
          950: '#04040f',
          900: '#080818',
          850: '#0d0d24',
          800: '#111130',
          700: '#1a1a45',
          600: '#252560',
        },
        // Primary violet-indigo accent
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Secondary cyan accent
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Success emerald
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        // Warning amber
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        // Danger rose
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, #1a1a45 0%, #04040f 60%)',
        'card-gradient': 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.05) 100%)',
        'violet-glow': 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-violet': '0 0 40px rgba(139,92,246,0.25)',
        'glow-cyan': '0 0 30px rgba(6,182,212,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover': '0 8px 48px rgba(139,92,246,0.2), 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
