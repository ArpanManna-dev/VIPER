/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // VIPER severity/brand tokens — used directly by our own components.
        critical: '#ef4444',
        high:     '#f97316',
        medium:   '#eab308',
        success:  '#22c55e',
        chain:    '#a855f7',
        blue:     '#3b82f6',

        // shadcn/ui theme slots (channel triplets defined in src/styles/index.css)
        // — every ui/*.jsx primitive (Table, Tabs, Tooltip, Badge, Card, Button,
        // Progress, Separator) depends on these; components.json requested them
        // (cssVariables: true) but the :root block was never generated.
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ["'Geist Variable'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        mono: ["'Fira Code'", "'JetBrains Mono'", 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        meteor: {
          '0%':   { transform: 'translate(0, 0) rotate(215deg)', opacity: 0 },
          '10%':  { opacity: 1 },
          '100%': { transform: 'translate(-500px, 500px) rotate(215deg)', opacity: 0 },
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        meteor: 'meteor 4s linear infinite',
      },
    },
  },
  plugins: [],
}
