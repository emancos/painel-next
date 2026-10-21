import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090D16',
        card: '#111827',
        border: '#1F2937',
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'ticket-flash': 'flashTicket 1.2s ease-in-out 3',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 25px rgba(6, 182, 212, 0.25)' },
          '50%': { boxShadow: '0 0 45px rgba(6, 182, 212, 0.55)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flashTicket: {
          '0%, 100%': { borderColor: 'rgba(6, 182, 212, 0.8)', backgroundColor: 'rgba(15, 23, 42, 0.9)' },
          '50%': { borderColor: 'rgba(52, 211, 153, 1)', backgroundColor: 'rgba(6, 78, 59, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}

export default config
