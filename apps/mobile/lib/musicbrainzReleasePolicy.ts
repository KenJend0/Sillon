// Miroir de apps/web/lib/musicbrainzReleasePolicy.mjs — module pur, aucune dépendance native.

type ReleaseGroupTypeInfo = {
  'primary-type'?: string;
  'secondary-types'?: string[];
};

// Secondary types qui indiquent une release non-studio (live, compilation...).
export const EXCLUDED_SECONDARY_TYPES = new Set([
  'Live', 'Compilation', 'Remix', 'Demo',
  'Spokenword', 'Interview',
  'Audiobook', 'Audio drama', 'Field recording',
]);

const EXCLUDED_SECONDARY_TYPES_ALLOWING_LIVE = new Set(
  [...EXCLUDED_SECONDARY_TYPES].filter((t) => t !== 'Live')
);

const DEFAULT_ALLOWED_PRIMARY_TYPES = new Set(['Album', 'EP']);

export function isAcceptableReleaseGroup(
  rg: ReleaseGroupTypeInfo,
  { allowLive = false, allowedPrimaryTypes = DEFAULT_ALLOWED_PRIMARY_TYPES }: { allowLive?: boolean; allowedPrimaryTypes?: Set<string> } = {}
): boolean {
  const primary = rg['primary-type'];
  if (primary && !allowedPrimaryTypes.has(primary)) return false;
  const secondaryTypes = rg['secondary-types'] || [];
  const excluded = allowLive ? EXCLUDED_SECONDARY_TYPES_ALLOWING_LIVE : EXCLUDED_SECONDARY_TYPES;
  return !secondaryTypes.some((t) => excluded.has(t));
}
