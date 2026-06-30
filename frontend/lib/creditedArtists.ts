export type CreditedArtistRef = { id: string; name: string };
export type FeaturedCredit = { artist: CreditedArtistRef; joinphrase: string | null };

// Fallback separator when a credit row has no joinphrase (shouldn't normally happen —
// MusicBrainz always supplies one between two credited names).
const DEFAULT_JOINPHRASE = ' feat. ';

/** Builds the ordered list of (separator, artist) pairs for rendering
 *  "Primary & Artist B feat. Artist C" with the exact MB joinphrases. */
export function creditParts(
  primary: CreditedArtistRef,
  featured: FeaturedCredit[]
): Array<{ prefix: string; artist: CreditedArtistRef }> {
  return [
    { prefix: '', artist: primary },
    ...featured.map((f) => ({ prefix: f.joinphrase || DEFAULT_JOINPHRASE, artist: f.artist })),
  ];
}
