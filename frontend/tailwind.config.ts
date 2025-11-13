import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System MusicBoxd
        background: {
          DEFAULT: '#0a0a0a',      // bg-neutral-950
          elevated: '#171717',      // bg-neutral-900
          hover: '#262626',         // bg-neutral-800
        },
        border: {
          DEFAULT: '#262626',       // border-neutral-800
          subtle: '#404040',        // border-neutral-700
        },
        accent: {
          DEFAULT: '#34d399',       // emerald-400
          hover: '#10b981',         // emerald-500
          muted: '#064e3b',         // emerald-900/20
        },
        text: {
          primary: '#fafafa',       // text-neutral-50
          secondary: '#a3a3a3',     // text-neutral-400
          tertiary: '#737373',      // text-neutral-500
        }
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeight: {
        tight: '1.2',
        snug: '1.4',
        relaxed: '1.6',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.6)',
        'accent': '0 0 20px rgba(52, 211, 153, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;