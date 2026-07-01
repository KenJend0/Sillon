/**
 * Politique de filtrage par type et de sélection de release MusicBrainz —
 * partagée entre l'app Next.js (frontend/app/actions/musicbrainz.ts) et les
 * scripts Node autonomes (bulk-import, audit, repair, refix...).
 *
 * Module pur (aucune dépendance Next.js/Supabase/HTTP) — fichier .mjs plutôt
 * que .ts pour être importable tel quel par les scripts exécutés via `node`
 * sans étape de build, tout en restant importable depuis le code TypeScript
 * de l'app (allowJs activé dans tsconfig). Même convention que
 * frontend/lib/musicbrainzMatch.mjs.
 */

// Secondary types qui indiquent une release non-studio (live, compilation...).
// Live est exclu par défaut car un release-group "Live" qui matche une requête
// de recherche/import est quasi toujours le mauvais homonyme, pas ce que
// l'utilisateur cherche — sauf pour la discographie d'artiste (allowLive),
// où un artiste peut avoir un vrai album live distinct de ses studio albums.
export const EXCLUDED_SECONDARY_TYPES = new Set([
  'Live', 'Compilation', 'Remix', 'Demo',
  'Spokenword', 'Interview',
  'Audiobook', 'Audio drama', 'Field recording',
]);

const EXCLUDED_SECONDARY_TYPES_ALLOWING_LIVE = new Set(
  [...EXCLUDED_SECONDARY_TYPES].filter((t) => t !== 'Live')
);

const DEFAULT_ALLOWED_PRIMARY_TYPES = new Set(['Album', 'EP']);

/**
 * Un release-group MusicBrainz est-il un match acceptable pour "c'est bien
 * l'album/EP/single studio que l'utilisateur cherche" ?
 * @param {{ 'primary-type'?: string, 'secondary-types'?: string[] }} rg
 * @param {{ allowLive?: boolean, allowedPrimaryTypes?: Set<string> }} [opts]
 */
export function isAcceptableReleaseGroup(rg, { allowLive = false, allowedPrimaryTypes = DEFAULT_ALLOWED_PRIMARY_TYPES } = {}) {
  const primary = rg['primary-type'];
  if (primary && !allowedPrimaryTypes.has(primary)) return false;
  const secondaryTypes = rg['secondary-types'] || [];
  const excluded = allowLive ? EXCLUDED_SECONDARY_TYPES_ALLOWING_LIVE : EXCLUDED_SECONDARY_TYPES;
  return !secondaryTypes.some((t) => excluded.has(t));
}

/**
 * Choisit la meilleure release concrète au sein d'un release-group.
 * mode 'fewest' (singles/EP — évite les bonus tracks d'éditions maxi) ou
 * 'most' (albums complets — évite les pressings/promos incomplets).
 * @param {Array<{ id: string, status?: string, trackCount: number }>} releases
 * @param {'fewest'|'most'} [mode]
 */
export function pickBestRelease(releases, mode = 'most') {
  if (!releases || releases.length === 0) return null;
  const official = releases.filter((r) => r.status === 'Official');
  const candidates = official.length > 0 ? official : releases;
  const withTracks = candidates.filter((r) => r.trackCount > 0);
  const pool = withTracks.length > 0 ? withTracks : candidates;
  return [...pool].sort((a, b) =>
    mode === 'fewest' ? a.trackCount - b.trackCount : b.trackCount - a.trackCount
  )[0];
}

/** Quel mode pickBestRelease doit utiliser selon le primary-type du release-group. */
export function releaseSelectionMode(primaryType) {
  return primaryType === 'Single' || primaryType === 'EP' ? 'fewest' : 'most';
}
