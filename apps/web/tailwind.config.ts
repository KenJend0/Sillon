import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────────────────────
// SILLON — Charte Graphique v2
// Esthétique : journal intime analogique. Chaud, doux, pas technologique.
// Polices : Instrument Serif (display/titres) + Inter (corps)
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {

        // ── Fonds ───────────────────────────────────────────────────────────
        background: {
          DEFAULT:   '#F5F3EF',   // Fond principal — crème chaude
          secondary: '#ECE8E1',   // Surface cards, inputs
          tertiary:  '#E4DFD6',   // Surface feed cards, hover
        },
        'paper-hi': '#FAF8F4',    // Fond clair — hover, modales, sidebar, badges

        // ── Texte & encre ───────────────────────────────────────────────────
        text: {
          primary:  '#1C1C1C',    // Corps de texte principal
          secondary:'#6B6B6B',    // Métadonnées, descriptions
          tertiary: '#9A9A9A',    // Timestamps, labels secondaires
          disabled: '#BDBDBD',    // Désactivé
          warm:     '#2A2520',    // Encre tiède — titres Instrument Serif uniquement
        },

        // ── Accents ─────────────────────────────────────────────────────────
        accent: {
          DEFAULT: '#8E6F5E',     // Brun chaud — liens, badges, ornements
          deep:    '#5C4538',     // Brun profond — hover, CTA primaires, italique display
          muted:   'rgba(142,111,94,0.08)', // Fond très léger accent
        },
        sage:    '#7A8471',       // Sauge — boutons Suivre, états neutres
        like:    '#C86C6C',       // Rouge désaturé — likes, cœurs

        // ── Bordures & filets ────────────────────────────────────────────────
        border: {
          DEFAULT: '#D8D3CB',     // Bordure standard
          divider: '#DDD7CF',     // Séparateur léger
        },
        rule:    '#C9C2B5',       // Filet ornemental — séparateurs de date, sidebar
      },

      // ── Polices ────────────────────────────────────────────────────────────
      // Inter      → tout le corps de texte, labels, boutons
      // Instrument Serif → titres de page (h1/h2 global via CSS), noms d'albums,
      //              stats chiffrées, badges de note, citations en italique
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
      },

      fontWeight: {
        normal: '400',
        medium: '500',
      },

      // ── Échelle typographique ───────────────────────────────────────────────
      // h1 (32px) et h2 (22px) → Instrument Serif via globals.css (override global)
      // h3+ et tout le reste   → Inter
      fontSize: {
        'h1':    ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '400' }],
        'h2':    ['22px', { lineHeight: '1.2', letterSpacing: '-0.005em', fontWeight: '400' }],
        'h3':    ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        'body':  ['16px', { lineHeight: '1.75', fontWeight: '400' }],
        'meta':  ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'sm':    ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.5', letterSpacing: '0.06em', fontWeight: '500' }],
        // Eyebrow : Inter 11px uppercase tracking-[0.22em] text-text-tertiary (via classes Tailwind)
      },

      lineHeight: {
        tight:   '1.2',
        snug:    '1.4',
        relaxed: '1.75',
      },

      // ── Rayons ─────────────────────────────────────────────────────────────
      borderRadius: {
        'card':     '12px',   // Cards, modales
        'card-lg':  '14px',   // Sidebar, banners
        'button':   '8px',    // Boutons rectangulaires
        'pill':     '99px',   // Boutons pill, tags, nav flottante
        'input':    '10px',   // Champs de saisie
        'cover':    '10px',   // Covers d'album en grille
        'cover-sm': '8px',    // Covers dans les cards compactes
        'badge':    '6px',    // Badge tampon de note
        'badge-sm': '5px',    // Badge tampon sur covers de grille
      },

      // ── Espacement sémantique ──────────────────────────────────────────────
      spacing: {
        'section-lg': '48px',
        'section-md': '32px',
        'section-sm': '16px',
        'micro':      '8px',
      },

      // ── Ombres ─────────────────────────────────────────────────────────────
      boxShadow: {
        'subtle':  '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card':    '0 1px 2px rgba(0, 0, 0, 0.04)',
        'cover':   '0 2px 6px rgba(60, 40, 20, 0.10)',
        'nav':     '0 8px 20px -8px rgba(60, 40, 20, 0.18), 0 1px 2px rgba(0,0,0,0.04)',
        'sidebar': '0 1px 2px rgba(0, 0, 0, 0.03)',
      },

      // ── Largeurs max ───────────────────────────────────────────────────────
      maxWidth: {
        'page': '672px',   // Colonne contenu principale
      },
    },
  },
  plugins: [],
};

export default config;
