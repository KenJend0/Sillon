import type { TextStyle } from 'react-native';

/**
 * Échelle typographique — miroir des tokens `fontSize` de apps/web/tailwind.config.ts
 * + du CSS global `h1, h2 { font-family: Instrument Serif }` (apps/web/app/globals.css).
 * Le Tailwind mobile (apps/mobile/tailwind.config.js) ne définit PAS ces tailles
 * sémantiques (text-h2/text-meta/text-label n'existent pas côté mobile) — les classes
 * homonymes ne font donc rien silencieusement. On applique la taille/police en style
 * inline explicite, en gardant les classes Tailwind uniquement pour la couleur.
 *
 * h1 n'est pas ici : sa valeur (32px, tracking -0.02em, leading 1.2) n'est utilisée
 * qu'une fois (titre d'album dans AlbumHero) et reste inline sur place.
 */

export const h2Style: TextStyle = {
  fontFamily: 'InstrumentSerif_400Regular',
  fontSize: 22,
  lineHeight: 26,
  letterSpacing: -0.11,
};

export const bodyStyle: TextStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 16,
  lineHeight: 28,
};

export const metaStyle: TextStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 14,
  lineHeight: 21,
};

export const metaMediumStyle: TextStyle = {
  fontFamily: 'Inter_500Medium',
  fontSize: 14,
  lineHeight: 21,
};

export const smStyle: TextStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 13,
  lineHeight: 19.5,
};

export const labelStyle: TextStyle = {
  fontFamily: 'Inter_500Medium',
  fontSize: 12,
  lineHeight: 18,
  letterSpacing: 0.72,
};
