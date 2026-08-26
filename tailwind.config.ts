import type { Config } from 'tailwindcss';

/**
 * Modernist design tokens, ported from the design-system stylesheet
 * (_ds/modernist-…/styles.css).
 *
 * The authoritative hex values live once, as CSS custom properties in
 * `app/globals.css :root` (so gradients / `color-mix()` in unavoidable inline
 * styles resolve too). Tailwind maps every token name onto `var(--…)` here, so
 * no component ever hard-codes a hex. Retune a value in one place.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        divider: 'var(--color-divider)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
        },
        // Lighthouse score scale. `-ink` is the text-safe pair for each ring
        // colour; see the contrast note beside the tokens in globals.css.
        score: {
          pass: 'var(--color-score-pass)',
          'pass-ink': 'var(--color-score-pass-ink)',
          average: 'var(--color-score-average)',
          'average-ink': 'var(--color-score-average-ink)',
          fail: 'var(--color-score-fail)',
          'fail-ink': 'var(--color-score-fail-ink)',
        },
        neutral: {
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'ds-1': 'var(--space-1)',
        'ds-2': 'var(--space-2)',
        'ds-3': 'var(--space-3)',
        'ds-4': 'var(--space-4)',
        'ds-6': 'var(--space-6)',
        'ds-8': 'var(--space-8)',
        gutter: 'clamp(20px, 5vw, 72px)',
      },
      maxWidth: {
        content: '1440px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      keyframes: {
        'dh-marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'dh-blink': {
          '0%, 55%': { opacity: '1' },
          '56%, 100%': { opacity: '0' },
        },
        'dh-rise': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'dh-grid': {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '0 -64px' },
        },
        // Oscillates rather than spinning a full turn: a 4:1 wordmark passes
        // edge-on twice per revolution and vanishes.
        //
        // No fill-mode on purpose. The reduced-motion rule in globals.css cuts
        // the duration to nothing, so the element falls back to its untransformed
        // state — flat and face-on, with the wordmark fully legible. That is the
        // pose we would have picked for a still anyway.
        'dh-tilt': {
          '0%, 100%': { transform: 'rotateY(-19deg)' },
          '50%': { transform: 'rotateY(19deg)' },
        },
      },
      animation: {
        'dh-marquee': 'dh-marquee 34s linear infinite',
        'dh-blink': 'dh-blink 1.1s steps(1) infinite',
        'dh-rise': 'dh-rise 600ms ease both',
        'dh-grid': 'dh-grid 9s linear infinite',
        'dh-tilt': 'dh-tilt 11s cubic-bezier(0.45,0,0.55,1) infinite',
      },
    },
    // Radius is 0 everywhere on purpose (Modernist). `full` stays available for
    // the genuinely circular controls (e.g. the radio dot) that opt in explicitly.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px',
    },
  },
  plugins: [],
};

export default config;
