import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a1628', 2: '#0f1f3a', 3: '#152a4a' },
        water: { DEFAULT: '#1a3a6a', 2: '#1e4a7a' },
        hit: '#ff4444',
        sunk: '#cc2222',
        gold: '#ffd700',
      },
      animation: {
        'explode': 'explode .3s ease-out',
        'toast-in': 'toastIn .2s ease-out',
      },
      keyframes: {
        explode: {
          '0%': { transform: 'scale(1.3)', background: '#ff6600' },
          '50%': { transform: 'scale(.9)' },
          '100%': { transform: 'scale(1)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
