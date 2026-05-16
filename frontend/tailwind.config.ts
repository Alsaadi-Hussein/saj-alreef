import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold:    { DEFAULT: '#DCA95C', light: '#F0C878', dark: '#B8892A' },
        bk:      '#080808',
        c1:      '#111111',
        c2:      '#1A1A1A',
        c3:      '#242424',
        c4:      '#343434',
        ok:      '#4CAF50',
        err:     '#E24B4A',
        warn:    '#E8A020',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Amiri', 'Georgia', 'serif'],
      },
      keyframes: {
        slideUp:   { from: { transform: 'translateY(14px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideLeft: { from: { transform: 'translateX(14px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        blink:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        pingGold:  { '0%': { transform: 'scale(1)', opacity: '0.7' }, '80%,100%': { transform: 'scale(2.4)', opacity: '0' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 0 0 rgba(220,169,92,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(220,169,92,0)' } },
        starPop:   { '0%': { transform: 'scale(1)' }, '45%': { transform: 'scale(1.55)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'slide-up':    'slideUp 0.32s ease both',
        'slide-left':  'slideLeft 0.3s ease both',
        'fade-in':     'fadeIn 0.3s ease',
        'blink':       'blink 1s infinite',
        'ping-gold':   'pingGold 1.8s infinite',
        'pulse-gold':  'pulseGold 2.5s infinite',
        'star-pop':    'starPop 0.35s ease',
      },
    },
  },
  plugins: [],
} satisfies Config
