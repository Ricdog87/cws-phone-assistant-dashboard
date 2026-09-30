import type { Config } from 'tailwindcss';

// Farben verweisen ausschliesslich auf die CSS-Variablen aus src/styles/tokens.css
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          accent: 'var(--brand-accent)',
          ink: 'var(--brand-ink)',
        },
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        band: {
          a: 'var(--band-a)',
          b: 'var(--band-b)',
          c: 'var(--band-c)',
        },
        customer: 'var(--customer)',
        outcome: {
          appointment: 'var(--outcome-appointment)',
          callback: 'var(--outcome-callback)',
          notreached: 'var(--outcome-not-reached)',
          notinterested: 'var(--outcome-not-interested)',
        },
      },
      fontFamily: {
        sans: ['Arial', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
